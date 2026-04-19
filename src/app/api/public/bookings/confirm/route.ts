import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { sendBookingConfirmation, sendOwnerNotification } from "@/lib/email";
import { formatCents } from "@/lib/types";

// Called by the booking-confirmed page after Stripe redirects back.
// Verifies the Checkout Session was paid, then creates the booking + client.
export async function POST(request: NextRequest) {
  const { session_id } = await request.json().catch(() => ({}));
  if (!session_id || typeof session_id !== "string") {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent"],
    });
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
      return NextResponse.json({ id: existing.id, ok: true, already_confirmed: true });
    }
  }

  const businessId = metadata.business_id!;
  const serviceId = metadata.service_id!;
  const startAt = new Date(metadata.start_at!);
  const name = metadata.name!;
  const email = metadata.email!;
  const phone = metadata.phone || null;
  const notes = metadata.notes || null;
  const smsConsent = metadata.sms_consent === "true";

  // Re-fetch business + service
  const { data: business } = await supabase
    .from("businesses")
    .select("id, business_name, slug, contact_email, owner_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, deposit_cents")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60_000);

  // One more overlap check (rare race)
  const { data: overlap } = await supabase
    .from("bookings")
    .select("id")
    .eq("business_id", businessId)
    .neq("status", "cancelled")
    .lt("start_at", endAt.toISOString())
    .gt("end_at", startAt.toISOString())
    .limit(1);
  if (overlap && overlap.length > 0) {
    return NextResponse.json(
      { error: "That time was booked while you were paying. Please contact us for a refund." },
      { status: 409 }
    );
  }

  // Upsert client
  let clientId: string | null = null;
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("business_id", businessId)
    .ilike("email", email)
    .maybeSingle();

  const consentFields =
    smsConsent && phone
      ? { sms_consent: true, sms_consent_at: new Date().toISOString() }
      : {};

  if (existingClient) {
    clientId = existingClient.id;
    await supabase
      .from("clients")
      .update({ name, phone, notes, ...consentFields })
      .eq("id", clientId);
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

  // Create booking with deposit_paid=true
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

  // Create future series bookings (no additional deposit)
  if (booking?.series_id) {
    const n = parseInt(session.metadata?.series_occurrences ?? "1", 10);
    const w = booking.series_interval_weeks as number;
    for (let i = 1; i < n && i < 12; i++) {
      const nextStart = new Date(startAt.getTime() + i * w * 7 * 24 * 60 * 60 * 1000);
      const nextEnd = new Date(nextStart.getTime() + service.duration_minutes * 60_000);
      const { data: conflict } = await supabase
        .from("bookings")
        .select("id")
        .eq("business_id", businessId)
        .neq("status", "cancelled")
        .lt("start_at", nextEnd.toISOString())
        .gt("end_at", nextStart.toISOString())
        .limit(1);
      if (conflict && conflict.length > 0) continue;
      await supabase.from("bookings").insert({
        business_id: businessId,
        client_id: clientId,
        service_id: service.id,
        start_at: nextStart.toISOString(),
        end_at: nextEnd.toISOString(),
        status: "confirmed",
        series_id: booking.series_id,
        series_interval_weeks: w,
      });
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

  if (bookingErr || !booking) {
    return NextResponse.json(
      { error: bookingErr?.message ?? "Failed to create booking" },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const siteUrl = `${origin}/s/${business.slug}`;
  const dashboardUrl = `${origin}/dashboard/bookings`;
  const priceLabel = formatCents(service.price_cents);

  // Fire emails
  const tasks: Promise<unknown>[] = [
    sendBookingConfirmation({
      to: email,
      customerName: name,
      businessName: business.business_name,
      serviceName: service.name,
      startAt,
      price: priceLabel,
      siteUrl,
    }).catch((err) => console.error("Confirm email failed:", err)),
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

  return NextResponse.json({ id: booking.id, ok: true });
}
