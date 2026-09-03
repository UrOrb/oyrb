import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { sendOwnerNotification } from "@/lib/email";
import { notifyBookingConfirmed } from "@/lib/booking-notify";
import { formatCents } from "@/lib/types";
import { sanitizeReferralValue } from "@/lib/referrer-classifier";
import { sanitizeSurveyResponse } from "@/lib/survey-options";
import { checkBookingOverlap, isBookingConflictDbError } from "@/lib/booking-overlap";
import type { DailyBreakBlock } from "@/lib/booking-slots";
import { fillEmptyClientFields } from "@/lib/clients/fill-empty";
import { isWithinBusinessHoursInTimezone } from "@/lib/timezone";
import { reportError } from "@/lib/monitoring";

async function refundDepositAfterBookingFailure(params: {
  paymentIntentId: string | null;
  connectedAccountId: string | null;
  sessionId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!params.paymentIntentId) {
    return { ok: false, error: "Missing payment intent for refund." };
  }

  try {
    await stripe.refunds.create(
      {
        payment_intent: params.paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          oyrb_reason: "booking_creation_failed",
          oyrb_detail: params.reason.slice(0, 200),
          checkout_session_id: params.sessionId,
        },
      },
      {
        ...(params.connectedAccountId ? { stripeAccount: params.connectedAccountId } : {}),
        idempotencyKey: `booking-failed-refund-${params.paymentIntentId}`,
      },
    );
    return { ok: true };
  } catch (err) {
    reportError("deposit_refund_failed_after_booking_failure", err, {
      session_id: params.sessionId,
      has_payment_intent: Boolean(params.paymentIntentId),
      has_connected_account: Boolean(params.connectedAccountId),
      reason: params.reason,
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Refund failed",
    };
  }
}

// Called by the booking-confirmed page after Stripe redirects back.
// Verifies the Checkout Session was paid, then creates the booking + client.
//
// Connect: deposits are charged on the pro's connected account, so the
// session lives there too. The success URL carries `acct=` from
// deposit-checkout — pass it as `stripeAccount` when retrieving or Stripe
// returns 404.
export async function POST(request: NextRequest) {
  const parsed = await request.json().catch(() => ({} as Record<string, unknown>));
  const session_id = typeof parsed.session_id === "string" ? parsed.session_id : null;
  const connectedAccountId =
    typeof parsed.connected_account_id === "string" && parsed.connected_account_id.startsWith("acct_")
      ? parsed.connected_account_id
      : null;
  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(
      session_id,
      { expand: ["payment_intent"] },
      connectedAccountId ? { stripeAccount: connectedAccountId } : undefined,
    );
  } catch (err) {
    console.error("Session retrieve failed:", err);
    return NextResponse.json({ error: "Invalid session" }, { status: 404 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Payment not completed", status: session.payment_status },
      { status: 402 }
    );
  }

  const metadata = session.metadata ?? {};
  if (metadata.booking_type !== "deposit") {
    return NextResponse.json({ error: "Not a booking session" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Idempotency: if this session_id already created a booking, return it
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (paymentIntentId) {
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    if (existing) {
      const existingEmail = (session.metadata?.email ?? "").toLowerCase() || null;
      return NextResponse.json({ id: existing.id, ok: true, already_confirmed: true, email: existingEmail });
    }
  }

  const businessId = metadata.business_id!;
  const serviceId = metadata.service_id!;
  const startAt = new Date(metadata.start_at!);
  const name = metadata.name!;
  const email = (metadata.email ?? "").toLowerCase();
  const phone = metadata.phone || null;
  const notes = metadata.notes || null;
  const smsConsent = metadata.sms_consent === "true";

  // Re-fetch business + service. Pulling the scheduling-rule columns
  // here so the post-Stripe race-guard runs the same overlap check the
  // pre-payment route ran — including break_between_appointments and
  // daily_break_blocks. A pro who configures a noon-1pm break shouldn't
  // get a booking landing in it just because a different client paid
  // first via a stale Checkout Session.
  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, business_name, slug, contact_email, owner_id, subscription_tier, stripe_connect_account_id, timezone, break_between_appointments_minutes, daily_break_blocks",
    )
    .eq("id", businessId)
    .maybeSingle();
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Deposits are always charged on THIS business's connected account
  // (deposit-checkout refuses to open a session otherwise). Without this
  // check, anyone with their own connected account could craft a paid
  // session there with forged metadata pointing at another pro's
  // business_id and get a confirmed, "deposit paid" booking on the
  // victim's calendar while the money settled in their own account.
  if (
    !connectedAccountId ||
    connectedAccountId !== business.stripe_connect_account_id
  ) {
    return NextResponse.json(
      { error: "Session does not belong to this business" },
      { status: 403 },
    );
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, deposit_cents")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // The session must have actually collected at least the deposit this
  // service requires (tips make it larger, never smaller). Guards against
  // a hand-crafted low-amount session on the right account.
  if (
    (service.deposit_cents ?? 0) > 0 &&
    (session.amount_total ?? 0) < service.deposit_cents
  ) {
    return NextResponse.json(
      { error: "Payment amount does not cover the deposit" },
      { status: 402 },
    );
  }

  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60_000);

  const { data: hoursRows } = await supabase
    .from("business_hours")
    .select("day_of_week, is_open, open_time, close_time")
    .eq("business_id", businessId);
  if (!isWithinBusinessHoursInTimezone({
    startAt,
    endAt,
    hours: hoursRows ?? [],
    timeZone: (business as { timezone?: string | null }).timezone ?? "America/New_York",
  })) {
    const refund = await refundDepositAfterBookingFailure({
      paymentIntentId,
      connectedAccountId,
      sessionId: session_id,
      reason: "outside_business_hours_at_confirm",
    });
    return NextResponse.json(
      {
        error: refund.ok
          ? "That time is no longer available, so your deposit has been automatically refunded. Please pick another time."
          : "That time is no longer available. Your deposit needs manual refund review — please contact support@oyrb.space.",
      },
      { status: 409 },
    );
  }

  const businessRules = business as {
    break_between_appointments_minutes?: number;
    daily_break_blocks?: DailyBreakBlock[] | null;
  };
  const rulesBreak = businessRules.break_between_appointments_minutes ?? 15;
  const dailyBreakBlocks = businessRules.daily_break_blocks ?? [];

  // One more overlap check (rare post-Stripe race) — must mirror the
  // pre-payment validation in api/public/bookings/route.ts so a window
  // that was free at checkout-creation but got taken (or now overlaps a
  // configured break) gets caught before we land a paid booking on top.
  const overlapResult = await checkBookingOverlap(
    supabase,
    businessId,
    startAt,
    endAt,
    rulesBreak,
    null,
    dailyBreakBlocks,
  );
  if (!overlapResult.ok) {
    const refund = await refundDepositAfterBookingFailure({
      paymentIntentId,
      connectedAccountId,
      sessionId: session_id,
      reason: "slot_conflict_before_insert",
    });
    return NextResponse.json(
      {
        error: refund.ok
          ? "That time was booked while you were paying, so your deposit has been automatically refunded. Please pick another time."
          : "That time was booked while you were paying. Your deposit needs manual refund review — please contact support@oyrb.space.",
      },
      { status: 409 }
    );
  }

  // Upsert client. Lookup pulls existing name/phone/notes so the
  // fill-empty-only helper preserves anything the pro has curated via
  // the dashboard edit page. See src/lib/clients/fill-empty.ts.
  let clientId: string | null = null;
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id, name, phone, notes")
    .eq("business_id", businessId)
    .ilike("email", email)
    .maybeSingle();

  const consentFields: Record<string, unknown> = {};
  if (smsConsent && phone) {
    consentFields.sms_consent = true;
    consentFields.sms_consent_at = new Date().toISOString();
  }
  if (metadata.marketing_opt_in === "true") {
    consentFields.marketing_opt_in = true;
    consentFields.marketing_opt_in_at = new Date().toISOString();
    consentFields.marketing_opt_in_source = "booking_form";
  }

  if (existingClient) {
    clientId = existingClient.id;
    const { patch } = fillEmptyClientFields(
      existingClient as { name: string | null; phone: string | null; notes: string | null },
      { name, phone, notes },
    );
    if (Object.keys(patch).length > 0 || Object.keys(consentFields).length > 0) {
      await supabase
        .from("clients")
        .update({ ...patch, ...consentFields })
        .eq("id", clientId);
    }
  } else {
    const { data: newClient } = await supabase
      .from("clients")
      .insert({
        business_id: businessId,
        name,
        email,
        phone,
        notes,
        ...consentFields,
      })
      .select("id")
      .single();
    clientId = newClient?.id ?? null;
  }

  // Age gate metadata from Stripe session (set by deposit-checkout route)
  const ageConfirmed = metadata.age_confirmed === "true";
  const ageIsMinor = metadata.age_is_minor === "true";
  const guardianName = metadata.guardian_name ?? null;

  // Phase 5 — referral signals forwarded from the storefront-visit
  // cookie via deposit-checkout's metadata. Stripe metadata values
  // are strings; empty string maps back to NULL on insert. Defense-
  // in-depth re-sanitization in case metadata was tampered with
  // between checkout creation and webhook return.
  const utmSource = sanitizeReferralValue(metadata.utm_source) || null;
  const utmMedium = sanitizeReferralValue(metadata.utm_medium) || null;
  const utmCampaign = sanitizeReferralValue(metadata.utm_campaign) || null;
  const referrerUrl = sanitizeReferralValue(metadata.referrer_url) || null;
  const influencerCode = sanitizeReferralValue(metadata.influencer_code) || null;
  // Phase 5 closer — survey response from Stripe metadata. Re-validated
  // against the allowlist (defense in depth — empty string from
  // deposit-checkout becomes NULL).
  const surveyResponse = sanitizeSurveyResponse(metadata.survey_response);

  // Phase 5 — Pass the Torch attribution. Pre-insert lookup serves
  // both persistence (FK store on the booking row) and email reuse
  // (existing Layer-2 disclosure). See the matching block in
  // src/app/api/public/bookings/route.ts for the full design notes —
  // briefly:
  //   - PERSISTENCE captures historical fact, no is_published gate
  //   - EMAIL DISPLAY keeps the is_published gate (paused pros not
  //     named in fresh confirmations)
  //   - SELF-REFERRAL guard: a pro can't refer themselves
  let resolvedReferrer: { id: string; business_name: string; is_published: boolean } | null = null;
  const referrerSlug = metadata.referrer_slug;
  if (typeof referrerSlug === "string" && /^[a-z0-9-]{1,80}$/i.test(referrerSlug)) {
    const { data } = await supabase
      .from("businesses")
      .select("id, business_name, is_published")
      .eq("slug", referrerSlug)
      .maybeSingle();
    if (data) {
      resolvedReferrer = data as {
        id: string;
        business_name: string;
        is_published: boolean;
      };
    }
  }
  const referrerBusinessId =
    resolvedReferrer && resolvedReferrer.id !== businessId
      ? resolvedReferrer.id
      : null;

  // Create booking with deposit_paid=true. Migration 057 adds a final
  // database-level conflict guard, so even concurrent post-payment
  // confirmations cannot double-book the same provider/time.
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      business_id: businessId,
      client_id: clientId,
      service_id: service.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "confirmed",
      deposit_paid: true,
      stripe_payment_intent_id: paymentIntentId,
      // Phase 4.5 — drives the Booking Origin card on Where They
      // Come From. Post-deposit confirmation lands here from the
      // public Stripe Checkout flow; series children inherit the
      // same source below.
      booking_source: "public_widget",
      // Phase 5 — referral signals.
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      referrer_url: referrerUrl,
      influencer_code: influencerCode,
      // Phase 5 — Pass the Torch attribution.
      referrer_business_id: referrerBusinessId,
      // Phase 5 closer — "How did you hear about us?" survey response.
      survey_response: surveyResponse,
      ...(ageConfirmed ? { age_confirmed_at: new Date().toISOString(), age_is_minor: ageIsMinor, guardian_name: guardianName } : {}),
      ...((() => {
        const w = parseInt(session.metadata?.series_interval_weeks ?? "0", 10);
        const n = parseInt(session.metadata?.series_occurrences ?? "1", 10);
        if (w >= 2 && n >= 2) {
          return { series_id: crypto.randomUUID(), series_interval_weeks: w };
        }
        return {};
      })()),
    })
    .select("id, series_id, series_interval_weeks")
    .single();

  // Must run BEFORE the series loop and the loyalty counter below —
  // otherwise a failed insert still increments visit_count (and every
  // retry from the booking-confirmed page inflates it again, since the
  // idempotency lookup only matches once a booking row exists).
  if (bookingErr || !booking) {
    if (isBookingConflictDbError(bookingErr)) {
      const refund = await refundDepositAfterBookingFailure({
        paymentIntentId,
        connectedAccountId,
        sessionId: session_id,
        reason: "slot_conflict_at_insert",
      });
      return NextResponse.json(
        {
          error: refund.ok
            ? "That time was booked while you were paying, so your deposit has been automatically refunded. Please pick another time."
            : "That time was booked while you were paying. Your deposit needs manual refund review — please contact support@oyrb.space.",
        },
        { status: 409 },
      );
    }
    reportError("deposit_booking_insert_failed", bookingErr, {
      business_id: businessId,
      service_id: service.id,
      session_id,
      has_payment_intent: Boolean(paymentIntentId),
      has_connected_account: Boolean(connectedAccountId),
    });
    return NextResponse.json(
      { error: bookingErr?.message ?? "Failed to create booking" },
      { status: 500 }
    );
  }

  // Create future series bookings (no additional deposit)
  if (booking.series_id) {
    const n = parseInt(session.metadata?.series_occurrences ?? "1", 10);
    const w = booking.series_interval_weeks as number;
    for (let i = 1; i < n && i < 12; i++) {
      const nextStart = new Date(startAt.getTime() + i * w * 7 * 24 * 60 * 60 * 1000);
      const nextEnd = new Date(nextStart.getTime() + service.duration_minutes * 60_000);
      // Series children inherit parent's validation rules — break
      // buffer and daily_break_blocks both apply, matching the
      // pre-payment series loop in api/public/bookings/route.ts.
      const seriesOverlap = await checkBookingOverlap(
        supabase,
        businessId,
        nextStart,
        nextEnd,
        rulesBreak,
        null,
        dailyBreakBlocks,
      );
      if (!seriesOverlap.ok) continue;
      const { error: seriesErr } = await supabase.from("bookings").insert({
        business_id: businessId,
        client_id: clientId,
        service_id: service.id,
        start_at: nextStart.toISOString(),
        end_at: nextEnd.toISOString(),
        status: "confirmed",
        booking_source: "public_widget",
        // Phase 5 — series children inherit the parent's referral
        // signals (including survey response) so they aggregate to
        // the same source.
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        referrer_url: referrerUrl,
        influencer_code: influencerCode,
        referrer_business_id: referrerBusinessId,
        survey_response: surveyResponse,
        series_id: booking.series_id,
        series_interval_weeks: w,
      });
      if (seriesErr) {
        reportError("deposit_booking_series_insert_failed", seriesErr, {
          business_id: businessId,
          service_id: service.id,
          session_id,
        });
        continue;
      }
    }
  }

  // Increment client visit counter for loyalty (fails silently if column missing)
  if (clientId) {
    try {
      const { data: bizLoyalty } = await supabase
        .from("businesses")
        .select("loyalty_enabled, loyalty_threshold")
        .eq("id", businessId)
        .maybeSingle();
      if (bizLoyalty?.loyalty_enabled) {
        const { data: clientRow } = await supabase
          .from("clients")
          .select("visit_count")
          .eq("id", clientId)
          .maybeSingle();
        const newCount = ((clientRow?.visit_count ?? 0) as number) + 1;
        const rewardEarned = newCount >= (bizLoyalty.loyalty_threshold ?? 6);
        await supabase
          .from("clients")
          .update({
            visit_count: newCount,
            ...(rewardEarned ? { loyalty_reward_available: true } : {}),
          })
          .eq("id", clientId);
      }
    } catch {
      // Silent fallback if columns not yet migrated
    }
  }

  const origin = new URL(request.url).origin;
  const siteUrl = `${origin}/s/${business.slug}`;
  const dashboardUrl = `${origin}/dashboard/bookings`;
  const priceLabel = formatCents(service.price_cents);

  // Pass the Torch attribution — email-display branch. Reuses the
  // `resolvedReferrer` object captured by the pre-insert lookup
  // earlier in this function. Persistence already happened on the
  // booking row above (referrer_business_id); this branch only
  // computes the display name for the email's Layer-2 disclosure.
  // The is_published gate is intentional and distinct from
  // persistence — see the matching block in
  // src/app/api/public/bookings/route.ts.
  const referrerName =
    resolvedReferrer &&
    resolvedReferrer.is_published &&
    resolvedReferrer.id !== businessId
      ? resolvedReferrer.business_name
      : null;

  // Fire emails
  const tasks: Promise<unknown>[] = [
    notifyBookingConfirmed({
      bookingId: booking.id,
      businessId: business.id,
      businessName: business.business_name,
      businessSlug: business.slug,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      smsConsent,
      serviceName: service.name,
      startAt,
      priceLabel,
      siteUrl,
      businessTier: business.subscription_tier,
      referrerName,
    }).catch((err) => console.error("Confirm notify failed:", err)),
  ];

  let ownerEmail = business.contact_email;
  if (!ownerEmail) {
    const { data: auth } = await supabase.auth.admin.getUserById(business.owner_id);
    ownerEmail = auth?.user?.email ?? null;
  }
  if (ownerEmail) {
    tasks.push(
      sendOwnerNotification({
        to: ownerEmail,
        businessName: business.business_name,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        serviceName: service.name,
        startAt,
        price: priceLabel,
        notes,
        dashboardUrl,
      }).catch((err) => console.error("Owner email failed:", err))
    );
  }

  await Promise.all(tasks);

  return NextResponse.json({ id: booking.id, ok: true, email });
}
