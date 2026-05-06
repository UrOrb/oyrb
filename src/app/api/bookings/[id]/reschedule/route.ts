import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { resend, logEmailSendResult } from "@/lib/email";
import { getFromAddress, EmailPurpose, DEFAULT_REPLY_TO } from "@/lib/email-from";
import { sendSms, tierAllowsSms } from "@/lib/sms";
import { issueBookingToken } from "@/lib/booking-tokens";
import { checkBookingOverlap } from "@/lib/booking-overlap";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

/**
 * Pro-side reschedule. Auth-gated to the booking owner; 404 (not 403)
 * for both not-found AND not-owner so existence isn't leaked. Differs
 * from the client-side reschedule path in three deliberate ways:
 *
 *   1. NO 24h cutoff. Pros own their schedule and can move things any
 *      time (including same-day adjustments).
 *   2. NO business-hours validation. Pros sometimes accommodate outside
 *      their listed hours; the route doesn't second-guess them.
 *   3. SMS to the client when consent + tier permits. The client-side
 *      reschedule path doesn't currently send SMS — that's a known
 *      asymmetry flagged in the PR description.
 *
 * Atomicity: the booking update happens before any notification fires.
 * If the update fails the route returns 500 and no email/SMS goes out.
 * If a notification fails after a successful update, the reschedule
 * still stands — the client just doesn't hear about it from this route
 * (the next 24h-reminder cron will catch them up at the new time
 * because we reset reminder_sent_at + sms_reminder_sent_at on update).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { new_start_at?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.new_start_at) {
    return NextResponse.json({ error: "Missing new_start_at" }, { status: 400 });
  }

  const newStart = new Date(body.new_start_at);
  if (isNaN(newStart.getTime())) {
    return NextResponse.json({ error: "Invalid new time" }, { status: 400 });
  }
  if (newStart.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Can't reschedule into the past." },
      { status: 400 },
    );
  }

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select(`
      id, business_id, service_id, start_at, end_at, status,
      services(name, duration_minutes, price_cents),
      clients(id, name, email, phone, sms_consent),
      businesses(id, owner_id, business_name, slug, contact_email, phone, subscription_tier, break_between_appointments_minutes)
    `)
    .eq("id", id)
    .maybeSingle();

  const booking = bookingRow as unknown as {
    id: string;
    business_id: string;
    service_id: string;
    start_at: string;
    end_at: string;
    status: string;
    services: { name: string; duration_minutes: number; price_cents: number } | null;
    clients: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      sms_consent: boolean | null;
    } | null;
    businesses: {
      id: string;
      owner_id: string;
      business_name: string;
      slug: string;
      contact_email: string | null;
      phone: string | null;
      subscription_tier: string | null;
      break_between_appointments_minutes: number | null;
    } | null;
  } | null;

  // 404 covers BOTH not-found AND not-owner — no existence leak.
  if (!booking || !booking.businesses || booking.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!booking.services || !booking.clients) {
    return NextResponse.json({ error: "Booking is missing related data" }, { status: 500 });
  }

  if (booking.status !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed bookings can be rescheduled." },
      { status: 400 },
    );
  }

  // Compute new end from the booking's existing service duration. The
  // service can't change in a reschedule — only the time.
  const durationMin = booking.services.duration_minutes;
  const newEnd = new Date(newStart.getTime() + durationMin * 60_000);

  // Overlap check — exclude self (the booking-being-rescheduled would
  // otherwise conflict with itself if its current time happens to
  // overlap the candidate window).
  const breakMin = booking.businesses.break_between_appointments_minutes ?? 15;
  const admin = createAdminClient();
  const overlapResult = await checkBookingOverlap(
    admin,
    booking.business_id,
    newStart,
    newEnd,
    breakMin,
    booking.id,
  );
  if (!overlapResult.ok) {
    const c = overlapResult.conflict;
    const conflictTime = c.startAt.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const who = c.clientName ?? "another booking";
    return NextResponse.json(
      { error: `Time conflict — overlaps with ${who} at ${conflictTime}` },
      { status: 409 },
    );
  }

  const oldStart = new Date(booking.start_at);
  const nowIso = new Date().toISOString();

  const { error: updErr } = await admin
    .from("bookings")
    .update({
      start_at: newStart.toISOString(),
      end_at: newEnd.toISOString(),
      previous_start_at: booking.start_at,
      rescheduled_at: nowIso,
      // Reset reminder fields so the 24h cron re-fires for the new
      // time. Mirrors the client-side reschedule path.
      reminder_sent_at: null,
      sms_reminder_sent_at: null,
    })
    .eq("id", booking.id);
  if (updErr) {
    console.error("Pro reschedule update failed:", updErr);
    return NextResponse.json({ error: "Couldn't save the new time." }, { status: 500 });
  }

  // ── Best-effort notifications ─────────────────────────────────────
  // Email + (optional) SMS to the client. Failures are caught and
  // logged; the reschedule itself never rolls back.

  const whenLabel = newStart.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const oldLabel = oldStart.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Mint a fresh magic-link token for the email's "View my booking"
  // link. Existing tokens still work (they're scoped to booking_id, not
  // a specific time), but a fresh one keeps the link evergreen and
  // matches the booking-confirmation email's pattern.
  let tokenForLink: string | null = null;
  if (booking.clients.email) {
    const issued = await issueBookingToken({
      bookingId: booking.id,
      clientEmail: booking.clients.email,
    });
    if (issued.ok) tokenForLink = issued.token;
  }
  const bookingUrl = tokenForLink
    ? `${APP_URL}/booking/${tokenForLink}`
    : `${APP_URL}/s/${booking.businesses.slug}`;

  const proName = booking.businesses.business_name;
  const proContact = booking.businesses.phone ?? booking.businesses.contact_email ?? null;

  if (booking.clients.email && resend) {
    const clientEmailAddr = booking.clients.email;
    const clientName = booking.clients.name;
    const serviceName = booking.services.name;
    try {
      const result = await resend.emails.send({
        from: getFromAddress(EmailPurpose.BOOKING),
        replyTo: DEFAULT_REPLY_TO,
        to: clientEmailAddr,
        subject: `Schedule change from ${proName}: ${serviceName}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
            <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Schedule change</p>
            <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">${proName} moved your appointment.</h1>
            <p style="color:#525252;font-size:15px;line-height:1.55;margin:0 0 16px;">
              Hi ${clientName} — ${proName} updated the time of your upcoming ${serviceName}.
            </p>
            <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;">
              <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">New time</p>
              <p style="margin:0 0 14px;font-size:16px;font-weight:600;">${whenLabel}</p>
              <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Previously</p>
              <p style="margin:0;font-size:13px;text-decoration:line-through;color:#A3A3A3;">${oldLabel}</p>
            </div>
            <a href="${bookingUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">View my booking</a>
            ${proContact ? `
              <p style="color:#525252;font-size:13px;margin:24px 0 0;line-height:1.55;">
                If the new time doesn&apos;t work for you, please reach out to ${proName} directly at <strong>${proContact}</strong> to discuss.
              </p>
            ` : ""}
          </div>
        `,
      });
      await logEmailSendResult(result, {
        businessId: booking.business_id,
        bookingId: booking.id,
        recipientType: "client",
        purpose: "booking_rescheduled_by_pro",
        recipientAddress: clientEmailAddr,
      });
    } catch (err) {
      console.error("Pro reschedule client email failed:", err);
    }
  }

  // SMS to the client — only when consent + tier permits. sendSms
  // already handles the notification_log write internally (Phase 1.3
  // instrumentation), so no separate logNotification call here.
  if (
    booking.clients.phone &&
    booking.clients.sms_consent &&
    tierAllowsSms(booking.businesses.subscription_tier)
  ) {
    const smsBody = `${proName}: Your ${booking.services.name} was moved to ${whenLabel} (was ${oldLabel}). View: ${bookingUrl}. Reply STOP to opt out.`;
    await sendSms({
      to: booking.clients.phone,
      body: smsBody,
      businessId: booking.business_id,
      bookingId: booking.id,
      purpose: "booking_rescheduled_by_pro",
      recipientType: "client",
    }).catch((err) => {
      console.error("Pro reschedule SMS failed:", err);
    });
  }

  return NextResponse.json({
    ok: true,
    new_start_at: newStart.toISOString(),
    new_end_at: newEnd.toISOString(),
  });
}
