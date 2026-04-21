import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveToken } from "@/lib/booking-tokens";
import { resend } from "@/lib/email";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";
const RESCHEDULE_CUTOFF_MS = 24 * 60 * 60 * 1000;

/**
 * Client-initiated reschedule via magic-link token. Re-enforces the
 * 24-hour cutoff + availability + no-overlap server-side so a crafted
 * request can't bypass the UI guards. Emails both parties on success.
 */
export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const limit = rateLimit(`resched:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  let body: { token?: string; new_start_at?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.token || !body.new_start_at) {
    return NextResponse.json({ error: "Missing token or new time" }, { status: 400 });
  }

  const resolved = await resolveToken(body.token);
  if (!resolved || resolved.expired) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  const newStart = new Date(body.new_start_at);
  if (isNaN(newStart.getTime())) {
    return NextResponse.json({ error: "Invalid new time" }, { status: 400 });
  }

  const now = new Date();
  if (newStart.getTime() <= now.getTime()) {
    return NextResponse.json({ error: "Can't reschedule into the past." }, { status: 400 });
  }
  if (newStart.getTime() - now.getTime() < RESCHEDULE_CUTOFF_MS) {
    return NextResponse.json(
      { error: "Can't reschedule into the next 24 hours." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select(`
      id, business_id, service_id, start_at, end_at, status,
      services(name, duration_minutes, price_cents),
      clients(name, email),
      businesses(business_name, slug, contact_email, phone, owner_id)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const booking = bookingRow as unknown as {
    id: string;
    business_id: string;
    service_id: string;
    start_at: string;
    end_at: string;
    status: string;
    services: { name: string; duration_minutes: number; price_cents: number } | null;
    clients: { name: string; email: string | null } | null;
    businesses: {
      business_name: string;
      slug: string;
      contact_email: string | null;
      phone: string | null;
      owner_id: string;
    } | null;
  } | null;

  if (!booking || !booking.services || !booking.businesses || !booking.clients) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking is cancelled" }, { status: 409 });
  }

  const oldStart = new Date(booking.start_at);
  if (oldStart.getTime() - now.getTime() < RESCHEDULE_CUTOFF_MS) {
    return NextResponse.json(
      {
        error:
          "Rescheduling within 24 hours isn't available. Please contact your beauty pro directly.",
      },
      { status: 403 },
    );
  }

  const durationMin = booking.services.duration_minutes;
  const newEnd = new Date(newStart.getTime() + durationMin * 60_000);

  // Verify the new slot falls inside the pro's open hours for that day.
  const { data: hoursRows } = await supabase
    .from("business_hours")
    .select("day_of_week, is_open, open_time, close_time")
    .eq("business_id", booking.business_id)
    .eq("day_of_week", newStart.getDay())
    .maybeSingle();
  const hours = hoursRows as {
    is_open: boolean;
    open_time: string | null;
    close_time: string | null;
  } | null;
  if (!hours?.is_open || !hours.open_time || !hours.close_time) {
    return NextResponse.json({ error: "Pro isn't open on that day." }, { status: 400 });
  }
  const [openH, openM] = hours.open_time.split(":").map(Number);
  const [closeH, closeM] = hours.close_time.split(":").map(Number);
  const dayOpen = new Date(newStart);
  dayOpen.setHours(openH, openM, 0, 0);
  const dayClose = new Date(newStart);
  dayClose.setHours(closeH, closeM, 0, 0);
  if (newStart < dayOpen || newEnd > dayClose) {
    return NextResponse.json({ error: "That time is outside open hours." }, { status: 400 });
  }

  // Verify no overlap with any other confirmed booking — excluding this one.
  const { data: overlap } = await supabase
    .from("bookings")
    .select("id")
    .eq("business_id", booking.business_id)
    .neq("status", "cancelled")
    .neq("id", booking.id)
    .lt("start_at", newEnd.toISOString())
    .gt("end_at", newStart.toISOString())
    .limit(1);
  if (overlap && overlap.length > 0) {
    return NextResponse.json(
      { error: "That slot was just booked — pick another." },
      { status: 409 },
    );
  }

  // Apply the reschedule.
  const { error: updErr } = await supabase
    .from("bookings")
    .update({
      start_at: newStart.toISOString(),
      end_at: newEnd.toISOString(),
      // Reset the reminder so the 24-hour cron re-sends for the new time.
      reminder_sent_at: null,
      sms_reminder_sent_at: null,
    })
    .eq("id", booking.id);
  if (updErr) {
    console.error("Reschedule update failed:", updErr);
    return NextResponse.json({ error: "Couldn't save the new time." }, { status: 500 });
  }

  // Best-effort emails to both parties. Failure here doesn't roll back
  // the reschedule — client will still see the confirmation page.
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
  const bookingUrl = `${APP_URL}/booking/${resolved.token}`;

  if (resend) {
    // Resolve owner email for the pro notification
    let ownerEmail = booking.businesses.contact_email;
    if (!ownerEmail) {
      const { data: auth } = await supabase.auth.admin.getUserById(booking.businesses.owner_id);
      ownerEmail = auth?.user?.email ?? null;
    }

    const tasks: Promise<unknown>[] = [];
    if (booking.clients.email) {
      tasks.push(
        resend.emails.send({
          from: FROM_EMAIL,
          to: booking.clients.email,
          subject: `Rescheduled: ${booking.services.name} with ${booking.businesses.business_name}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
              <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Reschedule confirmed ✦</p>
              <h1 style="font-size:24px;font-weight:600;margin:0 0 12px;">New time locked in, ${booking.clients.name}.</h1>
              <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">New time</p>
                <p style="margin:0 0 14px;font-size:16px;font-weight:600;">${whenLabel}</p>
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Previously</p>
                <p style="margin:0;font-size:13px;text-decoration:line-through;color:#A3A3A3;">${oldLabel}</p>
              </div>
              <a href="${bookingUrl}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">View my booking</a>
              <p style="color:#A3A3A3;font-size:11px;margin:24px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">
                Need to change again? The reschedule option in the confirmation page is open up to 24 hours before your appointment.
              </p>
            </div>
          `,
        }).catch((e) => console.error("Reschedule client email failed:", e)),
      );
    }
    if (ownerEmail) {
      tasks.push(
        resend.emails.send({
          from: FROM_EMAIL,
          to: ownerEmail,
          subject: `${booking.clients.name} rescheduled — ${booking.services.name}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
              <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Reschedule notice</p>
              <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">${booking.clients.name} moved their booking.</h1>
              <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Service</p>
                <p style="margin:0 0 14px;font-size:14px;font-weight:600;">${booking.services.name}</p>
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">New time</p>
                <p style="margin:0 0 14px;font-size:16px;font-weight:600;">${whenLabel}</p>
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Previously</p>
                <p style="margin:0;font-size:13px;text-decoration:line-through;color:#A3A3A3;">${oldLabel}</p>
              </div>
              <a href="${APP_URL}/dashboard/bookings" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">Open dashboard</a>
            </div>
          `,
        }).catch((e) => console.error("Reschedule owner email failed:", e)),
      );
    }
    await Promise.all(tasks);
  }

  return NextResponse.json({
    ok: true,
    new_start_at: newStart.toISOString(),
    new_end_at: newEnd.toISOString(),
  });
}
