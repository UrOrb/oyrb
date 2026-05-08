import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendOwnerNotification } from "@/lib/email";
import { formatCents } from "@/lib/types";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";
import { notifyBookingConfirmed } from "@/lib/booking-notify";
import { checkBookingOverlap } from "@/lib/booking-overlap";
import {
  parseReferralCookie,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referrer-classifier";
import { sanitizeSurveyResponse } from "@/lib/survey-options";

type BookingPayload = {
  business_id: string;
  service_id: string;
  start_at: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  sms_consent?: boolean;
  marketing_opt_in?: boolean;
  series_interval_weeks?: number | null;
  series_occurrences?: number | null;
  age_confirmed?: boolean;
  age_is_minor?: boolean;
  guardian_name?: string;
  /** Pass the Torch attribution: slug of the pro who referred this
   *  booking. When present + valid, the confirmation email gets the
   *  Layer-2 disclosure block. */
  referrer_slug?: string | null;
  /** Phase 5 closer — "How did you hear about us?" survey field.
   *  Lowercase enum code from src/lib/survey-options.ts when set.
   *  Validated against the allowlist before insert; arbitrary text
   *  stored as NULL. */
  survey_response?: string | null;
};

export async function POST(request: NextRequest) {
  // Spam guard: cap booking attempts per-IP. Booking inserts trigger owner
  // emails (Resend quota) and create real DB rows. 6/min, 30/hour is plenty
  // for legitimate human use, blocks scripted abuse.
  const ip = ipFromRequest(request);
  const minute = rateLimit(`book:m:${ip}`, 6, 60_000);
  const hour = rateLimit(`book:h:${ip}`, 30, 60 * 60_000);
  if (!minute.ok || !hour.ok) {
    return NextResponse.json(
      { error: "Too many booking attempts — please slow down." },
      { status: 429 }
    );
  }

  let body: BookingPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.business_id || !body.service_id || !body.start_at || !body.name || !body.email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Age gate is required. Minors must supply a guardian name.
  if (!body.age_confirmed) {
    return NextResponse.json({ error: "Age confirmation is required to book." }, { status: 400 });
  }
  if (body.age_is_minor && !(body.guardian_name && body.guardian_name.trim().length >= 2)) {
    return NextResponse.json({ error: "Parent or guardian name is required for minors." }, { status: 400 });
  }

  // Canonicalize the email so "Foo@x.com" and "foo@x.com" don't create
  // duplicate client rows. The rest of the pipeline already lower-cases
  // email when reading; do it on write too.
  body.email = body.email.toLowerCase();

  // RLS NOTE: this route uses the admin client because anonymous clients
  // need to insert booking + client rows. We protect those writes by
  // (a) requiring a published business, (b) scoping every insert to the
  // resolved business_id below, and (c) rate-limiting above. Do not relax
  // those checks without re-evaluating the trust model.
  const supabase = createAdminClient();

  // Load business + service (including booking rule columns so the route
  // can enforce interval / cutoff / break server-side).
  const { data: business } = await supabase
    .from("businesses")
    .select(`
      id, business_name, slug, contact_email, owner_id, is_published, subscription_tier,
      booking_interval_minutes, allow_last_minute_booking, last_minute_cutoff_hours,
      break_between_appointments_minutes, daily_break_blocks
    `)
    .eq("id", body.business_id)
    .maybeSingle();
  if (!business || !business.is_published) {
    return NextResponse.json({ error: "Business not accepting bookings" }, { status: 404 });
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents")
    .eq("id", body.service_id)
    .eq("business_id", body.business_id)
    .eq("active", true)
    .maybeSingle();
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const startAt = new Date(body.start_at);
  if (isNaN(startAt.getTime()) || startAt < new Date()) {
    return NextResponse.json({ error: "Invalid booking time" }, { status: 400 });
  }
  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60_000);

  // Enforce pro's booking rules server-side as defense-in-depth — a stale
  // widget, a crafted POST, or a client on a different timezone could all
  // otherwise bypass the UI-side filters.
  const rulesBreak = Math.max(
    0,
    Math.floor(
      ((business as { break_between_appointments_minutes?: number }).break_between_appointments_minutes ?? 15),
    ),
  );
  const allowLM = (business as { allow_last_minute_booking?: boolean }).allow_last_minute_booking ?? true;
  const cutoffHours =
    (business as { last_minute_cutoff_hours?: number }).last_minute_cutoff_hours ?? 2;
  const cutoffMs = cutoffHours * 60 * 60_000;
  const sinceNowMs = startAt.getTime() - Date.now();
  if (sinceNowMs < cutoffMs) {
    // When allowLM=true, we still block inside the cutoff window. When
    // allowLM=false, the same check applies — the effective behavior is
    // identical here; the toggle matters for UI hiding behavior only.
    if (!allowLM || sinceNowMs < cutoffMs) {
      return NextResponse.json(
        {
          error: `This time is too close to now. ${business.business_name} requires bookings at least ${cutoffHours}h in advance.`,
        },
        { status: 409 },
      );
    }
  }

  // Overlap check (incl. pro's break buffer on both sides) — shared with
  // the dashboard manual-entry action so the rule can't drift.
  const overlapResult = await checkBookingOverlap(
    supabase,
    body.business_id,
    startAt,
    endAt,
    rulesBreak,
  );
  if (!overlapResult.ok) {
    return NextResponse.json(
      { error: "That time conflicts with an existing booking or required break. Please pick another." },
      { status: 409 },
    );
  }

  // Upsert client
  let clientId: string | null = null;
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("business_id", body.business_id)
    .ilike("email", body.email)
    .maybeSingle();
  const consentFields: Record<string, unknown> = {};
  if (body.sms_consent && body.phone) {
    consentFields.sms_consent = true;
    consentFields.sms_consent_at = new Date().toISOString();
  }
  // Marketing opt-in is captured at the moment the client checked the box.
  // We only SET it to true here (never flip an existing true→false on
  // repeat bookings), so a client can't accidentally revoke consent by
  // booking again with the box unchecked. Unsubscribes go through the
  // unsub endpoint, which clears it explicitly.
  if (body.marketing_opt_in) {
    consentFields.marketing_opt_in = true;
    consentFields.marketing_opt_in_at = new Date().toISOString();
    consentFields.marketing_opt_in_source = "booking_form";
  }

  if (existingClient) {
    clientId = existingClient.id;
    await supabase
      .from("clients")
      .update({
        name: body.name,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        ...consentFields,
      })
      .eq("id", clientId);
  } else {
    const { data: newClient } = await supabase
      .from("clients")
      .insert({
        business_id: body.business_id,
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        ...consentFields,
      })
      .select("id")
      .single();
    clientId = newClient?.id ?? null;
  }

  // Series handling
  const weeks = Math.max(0, Math.min(8, Math.floor(body.series_interval_weeks ?? 0)));
  const occurrences = Math.max(1, Math.min(12, Math.floor(body.series_occurrences ?? 1)));
  const isSeries = weeks >= 2 && occurrences >= 2;
  const seriesId = isSeries ? crypto.randomUUID() : null;

  // Phase 5 — read referral signals from the cookie set by the proxy
  // on the original storefront visit. Defense-in-depth sanitization:
  // proxy already cleaned values at write time; parseReferralCookie
  // re-applies sanitization on read so a manually-edited cookie can't
  // sneak control characters into the DB. Missing cookie → all NULL,
  // analytics classify as "Direct" (since booking_source =
  // 'public_widget' and no other signals).
  const referral = parseReferralCookie(
    request.cookies.get(REFERRAL_COOKIE_NAME)?.value,
  );

  // Phase 5 — Pass the Torch attribution. Pre-insert lookup serves
  // two concerns at once:
  //
  //   1. PERSISTENCE — captures the historical fact that a referral
  //      happened. Resolved business_id is stored on the booking row
  //      via referrer_business_id (migration 046). Does NOT gate on
  //      is_published — a referral that happened, happened, even if
  //      the referring pro is currently paused.
  //
  //   2. EMAIL DISPLAY — the confirmation email's Layer-2 disclosure
  //      block names the referrer. This DOES gate on is_published so
  //      paused pros aren't named in fresh emails. Same data, different
  //      gate.
  //
  // Self-referral guard: a pro can't refer themselves. If the resolved
  // referrer's id matches the booking's business_id, both attribution
  // persistence and email display are NULL.
  let resolvedReferrer: { id: string; business_name: string; is_published: boolean } | null = null;
  if (
    typeof body.referrer_slug === "string" &&
    /^[a-z0-9-]{1,80}$/i.test(body.referrer_slug)
  ) {
    const { data } = await supabase
      .from("businesses")
      .select("id, business_name, is_published")
      .eq("slug", body.referrer_slug)
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
    resolvedReferrer && resolvedReferrer.id !== body.business_id
      ? resolvedReferrer.id
      : null;

  // Create primary booking
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      business_id: body.business_id,
      client_id: clientId,
      service_id: service.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "confirmed",
      age_confirmed_at: new Date().toISOString(),
      age_is_minor: !!body.age_is_minor,
      guardian_name: body.age_is_minor ? body.guardian_name?.trim() ?? null : null,
      // Phase 4.5 — drives the Booking Origin card on Where They Come
      // From. Public widget path; series children inherit the same
      // source below.
      booking_source: "public_widget",
      // Phase 5 — referral signals captured at storefront visit.
      utm_source: referral.utm_source,
      utm_medium: referral.utm_medium,
      utm_campaign: referral.utm_campaign,
      referrer_url: referral.referrer_url,
      // Phase 5 — Pass the Torch attribution. Resolved above; NULL if
      // slug didn't match a business or if the pro tried to refer
      // themselves (self-referral guard).
      referrer_business_id: referrerBusinessId,
      // Phase 5 closer — "How did you hear about us?" survey response.
      // Validated against the allowlist; non-matching values map to
      // NULL. Becomes the priority-1 source signal in canonical
      // attribution (TopSourcesCard, etc.); skipped by the conversion
      // analytics chain so view→booking funnel math stays consistent.
      survey_response: sanitizeSurveyResponse(body.survey_response),
      ...(isSeries ? { series_id: seriesId, series_interval_weeks: weeks } : {}),
    })
    .select("id")
    .single();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: bookingErr?.message ?? "Failed to create booking" }, { status: 500 });
  }

  // Create future series bookings
  let seriesCreated = 1;
  let seriesSkipped = 0;
  if (isSeries && seriesId) {
    for (let i = 1; i < occurrences; i++) {
      const nextStart = new Date(startAt.getTime() + i * weeks * 7 * 24 * 60 * 60 * 1000);
      const nextEnd = new Date(nextStart.getTime() + service.duration_minutes * 60_000);

      // Skip the slot if it overlaps anything (includes break buffer).
      const seriesOverlap = await checkBookingOverlap(
        supabase,
        body.business_id,
        nextStart,
        nextEnd,
        rulesBreak,
      );
      if (!seriesOverlap.ok) {
        seriesSkipped++;
        continue;
      }

      await supabase.from("bookings").insert({
        business_id: body.business_id,
        client_id: clientId,
        service_id: service.id,
        start_at: nextStart.toISOString(),
        end_at: nextEnd.toISOString(),
        status: "confirmed",
        booking_source: "public_widget",
        // Phase 5 — series children inherit the parent's referral
        // signals (including survey response) so they aggregate to
        // the same source.
        utm_source: referral.utm_source,
        utm_medium: referral.utm_medium,
        utm_campaign: referral.utm_campaign,
        referrer_url: referral.referrer_url,
        referrer_business_id: referrerBusinessId,
        survey_response: sanitizeSurveyResponse(body.survey_response),
        series_id: seriesId,
        series_interval_weeks: weeks,
      });
      seriesCreated++;
    }
  }

  const origin = new URL(request.url).origin;
  const siteUrl = `${origin}/s/${business.slug}`;
  const dashboardUrl = `${origin}/dashboard/bookings`;
  const priceLabel = formatCents(service.price_cents);

  // Owner email lookup (before awaiting emails so both can fire in parallel)
  let ownerEmail = business.contact_email;
  if (!ownerEmail) {
    const { data: auth } = await supabase.auth.admin.getUserById(business.owner_id);
    ownerEmail = auth?.user?.email ?? null;
  }

  // Send both emails in parallel — await so Vercel doesn't terminate before they complete.
  // Errors are caught so a failing email doesn't fail the booking response.
  const emailTasks: Promise<unknown>[] = [];

  // Pass the Torch attribution — email-display branch. Reuses the
  // `resolvedReferrer` object from the pre-insert lookup above.
  // The is_published gate is intentional and distinct from the
  // persistence path: paused referring pros are NOT named in fresh
  // confirmation emails (current presentation), but their
  // referral attribution IS persisted on the booking row
  // (historical fact). See the docblock above the resolution
  // block earlier in this function.
  const referrerName =
    resolvedReferrer &&
    resolvedReferrer.is_published &&
    resolvedReferrer.id !== body.business_id
      ? resolvedReferrer.business_name
      : null;

  emailTasks.push(
    notifyBookingConfirmed({
      bookingId: booking.id,
      businessId: business.id,
      businessName: business.business_name,
      businessSlug: business.slug,
      customerName: body.name,
      customerEmail: body.email,
      customerPhone: body.phone ?? null,
      smsConsent: !!body.sms_consent,
      serviceName: service.name,
      startAt,
      priceLabel,
      siteUrl,
      businessTier: business.subscription_tier,
      referrerName,
    }).catch((err) => {
      console.error("Customer notify failed:", err);
    })
  );

  if (ownerEmail) {
    emailTasks.push(
      sendOwnerNotification({
        to: ownerEmail,
        businessName: business.business_name,
        customerName: body.name,
        customerEmail: body.email,
        customerPhone: body.phone,
        serviceName: service.name,
        startAt,
        price: priceLabel,
        notes: body.notes,
        dashboardUrl,
      }).catch((err) => {
        console.error("Owner email failed:", err);
      })
    );
  }

  await Promise.all(emailTasks);

  return NextResponse.json({ id: booking.id, ok: true });
}
