import Link from "next/link";
import { resolveToken } from "@/lib/booking-tokens";
import { createAdminClient } from "@/lib/supabase/server";
import { availableDays, slotsForDay, type BusinessHoursRow, type SlotInterval } from "@/lib/booking-slots";
import { RescheduleForm } from "./reschedule-form";

// Magic-link pages are per-request + never indexed.
export const metadata = {
  robots: { index: false, follow: false },
  title: "Reschedule your booking — OYRB",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 24-hour cutoff. Within this window, clients must contact the pro
// directly — the automated reschedule surface is disabled.
const RESCHEDULE_CUTOFF_MS = 24 * 60 * 60 * 1000;

type Props = { params: Promise<{ token: string }> };

type BookingRow = {
  id: string;
  business_id: string;
  service_id: string;
  start_at: string;
  end_at: string;
  status: string;
  services: { id: string; name: string; duration_minutes: number; price_cents: number } | null;
  clients: { name: string; email: string | null } | null;
  businesses: {
    id: string;
    business_name: string;
    slug: string;
    contact_email: string | null;
    phone: string | null;
  } | null;
};

export default async function ReschedulePage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveToken(token);
  if (!resolved || resolved.expired) return <ExpiredView />;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select(`
      id, business_id, service_id, start_at, end_at, status,
      services(id, name, duration_minutes, price_cents),
      clients(name, email),
      businesses(id, business_name, slug, contact_email, phone)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const booking = data as unknown as BookingRow | null;
  if (!booking || !booking.services || !booking.businesses || !booking.clients) {
    return <NotFoundView />;
  }
  if (booking.status === "cancelled") {
    return <CancelledView />;
  }

  const startAt = new Date(booking.start_at);
  const now = new Date();
  const msUntil = startAt.getTime() - now.getTime();
  const withinCutoff = msUntil < RESCHEDULE_CUTOFF_MS;

  // Within 24h — show contact-the-pro message with whatever contact info
  // the pro has chosen to publish. Do not auto-reveal info they haven't.
  if (withinCutoff) {
    return (
      <WithinCutoffView
        businessName={booking.businesses.business_name}
        contactEmail={booking.businesses.contact_email}
        phone={booking.businesses.phone}
        token={token}
        startLabel={startAt.toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      />
    );
  }

  // More than 24h away — build the calendar.
  // 1) Load business hours + the pro's booking rules.
  const { data: hoursRows } = await supabase
    .from("business_hours")
    .select("day_of_week, is_open, open_time, close_time")
    .eq("business_id", booking.business_id);
  const hours = (hoursRows ?? []) as BusinessHoursRow[];

  const { data: rulesRow } = await supabase
    .from("businesses")
    .select(`
      booking_interval_minutes, allow_last_minute_booking,
      last_minute_cutoff_hours, break_between_appointments_minutes,
      daily_break_blocks
    `)
    .eq("id", booking.business_id)
    .maybeSingle();
  const rulesData = (rulesRow ?? {}) as {
    booking_interval_minutes?: number;
    allow_last_minute_booking?: boolean;
    last_minute_cutoff_hours?: number;
    break_between_appointments_minutes?: number;
    daily_break_blocks?: Array<{
      start: string;
      end: string;
      days: Array<"sun"|"mon"|"tue"|"wed"|"thu"|"fri"|"sat">;
    }>;
  };
  const bookingRules = {
    intervalMinutes: rulesData.booking_interval_minutes ?? 30,
    allowLastMinute: rulesData.allow_last_minute_booking ?? true,
    lastMinuteCutoffHours: rulesData.last_minute_cutoff_hours ?? 2,
    breakBetweenMinutes: rulesData.break_between_appointments_minutes ?? 15,
    dailyBreakBlocks: rulesData.daily_break_blocks ?? [],
  };

  // 2) Load the next 30 days of confirmed bookings on this pro's calendar
  //    — excluding this booking itself so the client can pick its current
  //    slot back if they change their mind.
  const rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data: busyRows } = await supabase
    .from("bookings")
    .select("id, start_at, end_at")
    .eq("business_id", booking.business_id)
    .neq("status", "cancelled")
    .gte("start_at", now.toISOString())
    .lte("start_at", rangeEnd.toISOString());

  const busy: SlotInterval[] = (busyRows ?? [])
    .filter((b: { id: string }) => b.id !== booking.id)
    .map((b: { start_at: string; end_at: string }) => ({
      start: new Date(b.start_at),
      end: new Date(b.end_at),
    }));

  const days = availableDays(hours);
  // Minimum allowed start is now + 24h. We don't let a client reschedule
  // into the next 24h window — that would defeat the cutoff.
  const minStart = new Date(now.getTime() + RESCHEDULE_CUTOFF_MS);

  // Pre-compute slot lists per-day so the client component doesn't need
  // to know about the business-hours + busy intervals structure.
  const daySlots = days.map((d) => ({
    dateIso: d.toISOString(),
    slots: slotsForDay(
      d,
      hours,
      booking.services!.duration_minutes,
      busy,
      minStart,
      bookingRules,
    ).map((s) => s.toISOString()),
  }));

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
            Reschedule
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium">
            Pick a new time for your {booking.services.name}
          </h1>
          <p className="mt-2 text-sm text-[#737373]">
            with <strong>{booking.businesses.business_name}</strong>
          </p>
          <p className="mt-1 text-[11px] text-[#A3A3A3]">
            Your current slot:{" "}
            {startAt.toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>

        <RescheduleForm
          token={token}
          daySlots={daySlots}
          durationMin={booking.services.duration_minutes}
          cancelHref={`/booking/${token}`}
        />

        <p className="mt-6 text-center text-[11px] text-[#A3A3A3]">
          Rescheduling is locked 24 hours before the appointment. Need a
          last-minute change? Contact{" "}
          <strong>{booking.businesses.business_name}</strong> directly.
        </p>
      </div>
    </div>
  );
}

function WithinCutoffView(props: {
  businessName: string;
  contactEmail: string | null;
  phone: string | null;
  token: string;
  startLabel: string;
}) {
  const { businessName, contactEmail, phone, token, startLabel } = props;
  const hasContact = !!(contactEmail || phone);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
          Reschedule locked
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium">
          Rescheduling within 24 hours isn&apos;t available.
        </h1>
        <p className="mt-3 text-sm text-[#525252]">
          Your appointment with <strong>{businessName}</strong> on{" "}
          <strong>{startLabel}</strong> is within 24 hours. Please contact
          your beauty pro directly to reschedule.
        </p>

        {hasContact && (
          <div className="mt-5 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-sm">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              {businessName}
            </p>
            <div className="space-y-1">
              {phone && (
                <p>
                  <a href={`tel:${phone}`} className="font-medium hover:text-[#B8896B]">
                    📞 {phone}
                  </a>
                  {" · "}
                  <a
                    href={`sms:${phone}`}
                    className="font-medium hover:text-[#B8896B]"
                  >
                    Text
                  </a>
                </p>
              )}
              {contactEmail && (
                <p>
                  <a href={`mailto:${contactEmail}`} className="font-medium hover:text-[#B8896B]">
                    ✉️ {contactEmail}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {!hasContact && (
          <p className="mt-5 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
            {businessName} hasn&apos;t listed a public contact. Try reaching
            them through the original booking confirmation email.
          </p>
        )}

        <Link
          href={`/booking/${token}`}
          className="mt-6 inline-block text-xs text-[#A3A3A3] underline"
        >
          ← Back to my booking
        </Link>
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">Booking not found</h1>
        <p className="mt-3 text-sm text-[#737373]">
          This link isn&apos;t valid. Check the URL from your confirmation email.
        </p>
      </div>
    </div>
  );
}

function CancelledView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">Booking cancelled</h1>
        <p className="mt-3 text-sm text-[#737373]">
          This booking has been cancelled, so there&apos;s nothing to reschedule.
        </p>
      </div>
    </div>
  );
}

function ExpiredView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">Link expired</h1>
        <p className="mt-3 text-sm text-[#737373]">
          Booking access links expire after 7 days. Contact your service
          provider to get a fresh link.
        </p>
      </div>
    </div>
  );
}
