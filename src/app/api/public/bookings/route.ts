import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendBookingConfirmation, sendOwnerNotification } from "@/lib/email";
import { formatCents } from "@/lib/types";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

type BookingPayload = {
  business_id: string;
  service_id: string;
  start_at: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  sms_consent?: boolean;
  series_interval_weeks?: number | null;
  series_occurrences?: number | null;
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

  // Load business + service
  const { data: business } = await supabase
    .from("businesses")
    .select("id, business_name, slug, contact_email, owner_id, is_published")
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

  // Check for overlap
  const { data: overlap } = await supabase
    .from("bookings")
    .select("id")
    .eq("business_id", body.business_id)
    .neq("status", "cancelled")
    .lt("start_at", endAt.toISOString())
    .gt("end_at", startAt.toISOString())
    .limit(1);
  if (overlap && overlap.length > 0) {
    return NextResponse.json({ error: "That time was just booked. Please pick another." }, { status: 409 });
  }

  // Upsert client
  let clientId: string | null = null;
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("business_id", body.business_id)
    .ilike("email", body.email)
    .maybeSingle();
  const consentFields = body.sms_consent && body.phone
    ? { sms_consent: true, sms_consent_at: new Date().toISOString() }
    : {};

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

      // Check overlap for this slot
      const { data: conflict } = await supabase
        .from("bookings")
        .select("id")
        .eq("business_id", body.business_id)
        .neq("status", "cancelled")
        .lt("start_at", nextEnd.toISOString())
        .gt("end_at", nextStart.toISOString())
        .limit(1);
      if (conflict && conflict.length > 0) {
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

  emailTasks.push(
    sendBookingConfirmation({
      to: body.email,
      customerName: body.name,
      businessName: business.business_name,
      serviceName: service.name,
      startAt,
      price: priceLabel,
      siteUrl,
    }).catch((err) => {
      console.error("Customer email failed:", err);
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
