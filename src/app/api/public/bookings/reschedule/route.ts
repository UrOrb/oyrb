import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveToken } from "@/lib/booking-tokens";
import {
  resend,
  sendBookingRescheduled,
  sendOwnerRescheduleAlert,
} from "@/lib/email";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";
import { checkBookingOverlap } from "@/lib/booking-overlap";
import type { DailyBreakBlock } from "@/lib/booking-slots";

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
      businesses(business_name, slug, contact_email, phone, owner_id, break_between_appointments_minutes, daily_break_blocks, removal_initiated_at, removal_scheduled_for)
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
      break_between_appointments_minutes: number | null;
      daily_break_blocks: DailyBreakBlock[] | null;
      // Phase 8 PR 4 — Remove Brand grace-period gating.
      removal_initiated_at: string | null;
      removal_scheduled_for: string | null;
    } | null;
  } | null;

  if (!booking || !booking.services || !booking.businesses || !booking.clients) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking is cancelled" }, { status: 409 });
  }

  // Phase 8 PR 4 — Remove Brand grace-period gate. If the pro has
  // initiated removal, clients can still reschedule WITHIN the
  // grace window, but not BEYOND `removal_scheduled_for` (the date
  // the account deletes). Lets a client move a booking up by a few
  // days while the pro finishes their grace, but blocks bookings
  // that would outlive the account itself.
  if (
    booking.businesses.removal_initiated_at &&
    booking.businesses.removal_scheduled_for
  ) {
    const removalDate = new Date(booking.businesses.removal_scheduled_for);
    if (newStart.getTime() >= removalDate.getTime()) {
      const dateLabel = removalDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return NextResponse.json(
        {
          error: `This pro is no longer accepting bookings on or after ${dateLabel}. Please pick an earlier date.`,
        },
        { status: 409 },
      );
    }
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

  // Defer to the shared helper so this client-side reschedule path
  // applies the SAME write-time validation as every other write path:
  // booking overlap (with break_between_appointments buffer on both
  // sides) AND daily_break_blocks for the candidate's day-of-week.
  // Pre-fix this route ran a raw `lt/gt` overlap that ignored both —
  // letting clients land bookings inside configured break windows or
  // back-to-back without the configured buffer.
  const breakMin = booking.businesses.break_between_appointments_minutes ?? 15;
  const dailyBreakBlocks = booking.businesses.daily_break_blocks ?? [];
  const overlapResult = await checkBookingOverlap(
    supabase,
    booking.business_id,
    newStart,
    newEnd,
    breakMin,
    booking.id,
    dailyBreakBlocks,
  );
  if (!overlapResult.ok) {
    return NextResponse.json(
      { error: "That time isn't available — please pick another." },
      { status: 409 },
    );
  }

  // Apply the reschedule.
  // previous_start_at + rescheduled_at audit columns added in
  // migration 039 (Phase 1 closer). Populated from BOTH reschedule
  // paths (here + the new pro-side route at /api/bookings/[id]/reschedule)
  // so the analytics surface stays consistent regardless of who
  // initiated the change.
  const { error: updErr } = await supabase
    .from("bookings")
    .update({
      start_at: newStart.toISOString(),
      end_at: newEnd.toISOString(),
      previous_start_at: booking.start_at,
      rescheduled_at: new Date().toISOString(),
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
  const bookingUrl = `${APP_URL}/booking/${resolved.token}`;

  if (resend) {
    const services = booking.services;
    const businesses = booking.businesses;
    const clients = booking.clients;

    // Resolve owner email for the pro notification
    let ownerEmail = businesses.contact_email;
    if (!ownerEmail) {
      const { data: auth } = await supabase.auth.admin.getUserById(businesses.owner_id);
      ownerEmail = auth?.user?.email ?? null;
    }

    const tasks: Promise<unknown>[] = [];
    if (clients.email) {
      tasks.push(
        sendBookingRescheduled({
          to: clients.email,
          businessId: booking.business_id,
          bookingId: booking.id,
          clientName: clients.name,
          businessName: businesses.business_name,
          serviceName: services.name,
          newStart,
          oldStart,
          bookingUrl,
        }),
      );
    }
    if (ownerEmail) {
      tasks.push(
        sendOwnerRescheduleAlert({
          to: ownerEmail,
          businessId: booking.business_id,
          bookingId: booking.id,
          clientName: clients.name,
          serviceName: services.name,
          newStart,
          oldStart,
        }),
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
