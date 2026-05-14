import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCents } from "@/lib/types";
import { Calendar, Clock, Mail, Phone, MessageSquare, ExternalLink } from "lucide-react";
import { CancelBookingButton } from "./cancel-button";
import { NewBookingForm } from "./new-booking-form";
import { getCurrentBusiness } from "@/lib/current-site";
import { getWeekRange } from "@/lib/business-brain";
import {
  localDateString,
  parseMondayParam,
  shiftLocalYmd,
} from "./_week/week-helpers";
import { WeekView } from "./_week/week-view";
import { WeekNav } from "./_week/week-nav";
import { ViewToggle } from "./_week/view-toggle";
import { DayView } from "./_week/day-view";

interface Props {
  searchParams: Promise<{
    siteId?: string;
    view?: string;
    week?: string;
    day?: string;
  }>;
}

/**
 * Bookings index. Phase 9 PR 7 — week is the new default; the
 * original list view is preserved behind ?view=list.
 *
 * Query strategy:
 *   week mode — fetch by start_at in [weekStart, weekEnd), ascending,
 *               no limit. Different shape than list because we need
 *               every booking that touches the visible week, not just
 *               the most-recent 100.
 *   list mode — unchanged from the pre-PR behavior: top 100 ordered
 *               descending, partitioned into upcoming / past sections.
 */
export default async function BookingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId, view: viewParam, week: weekParam, day: dayParam } =
    await searchParams;
  const business = await getCurrentBusiness(siteId);

  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Bookings</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first to start receiving bookings.</p>
      </div>
    );
  }

  const view: "week" | "list" = viewParam === "list" ? "list" : "week";

  // siteId is forwarded into every nav link so the visible business
  // doesn't flip when the pro paginates weeks.
  const baseQueryParts: string[] = [];
  if (siteId) baseQueryParts.push(`siteId=${encodeURIComponent(siteId)}`);

  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("name", { ascending: true });

  const tz = business.timezone ?? "America/New_York";

  // ──────────────────────────────────────────────────────────────────
  // LIST VIEW — preserved verbatim from the previous implementation.
  // ──────────────────────────────────────────────────────────────────
  if (view === "list") {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, services(name, price_cents), clients(name, email, phone)")
      .eq("business_id", business.id)
      .order("start_at", { ascending: false })
      .limit(100);

    const list = bookings ?? [];
    const upcoming = list.filter((b: ListBooking) => new Date(b.start_at) >= new Date());
    const past = list.filter((b: ListBooking) => new Date(b.start_at) < new Date());

    const baseQueryList = baseQueryParts.join("&");

    return (
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Bookings</h1>
            <p className="mt-1 text-sm text-[#737373]">All appointments, newest first.</p>
          </div>
          <NewBookingForm services={services ?? []} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <ViewToggle active="list" baseQuery={baseQueryList} />
        </div>

        <p className="mt-3 text-[11px] text-[#737373]">
          Need to refund a client? Each paid booking has a{" "}
          <span className="font-medium text-[#525252]">Refund</span> link
          that opens the payment in your Stripe Dashboard.
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">Upcoming ({upcoming.length})</h2>
          <div className="mt-3 space-y-2">
            {upcoming.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#E7E5E4] p-8 text-center text-sm text-[#737373]">
                No upcoming bookings yet. Share your site link to start booking.
              </div>
            ) : (
              upcoming.map((b: ListBooking) => <BookingRow key={b.id} b={b} />)
            )}
          </div>
        </section>

        {past.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#525252]">Past ({past.length})</h2>
            <div className="mt-3 space-y-2 opacity-80">
              {past.slice(0, 20).map((b: ListBooking) => <BookingRow key={b.id} b={b} />)}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // WEEK VIEW (default)
  // ──────────────────────────────────────────────────────────────────
  const todayWeek = getWeekRange(tz);
  const todayWeekStartYmd = localDateString(todayWeek.weekStart, tz);
  const todayYmd = localDateString(todayWeek.today, tz);

  const navigatedStart = parseMondayParam(weekParam, tz);
  const weekStart = navigatedStart ?? todayWeek.weekStart;
  const weekStartYmd = localDateString(weekStart, tz);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: weekBookings } = await supabase
    .from("bookings")
    .select(
      "id, status, start_at, end_at, services(name), clients(name)",
    )
    .eq("business_id", business.id)
    .gte("start_at", weekStart.toISOString())
    .lt("start_at", weekEnd.toISOString())
    .order("start_at", { ascending: true });

  const bookings = (weekBookings ?? []) as unknown as WeekBooking[];

  // baseQuery for the WeekView links — view + week stay scoped.
  const weekBaseParts = [...baseQueryParts, "view=week"];
  const baseQueryForNav = weekBaseParts.join("&");
  const baseQueryForToggle = baseQueryParts.concat([`week=${weekStartYmd}`]).join("&");

  // Resolve the active mobile day. If today is in the visible week,
  // default to today; otherwise default to the first day.
  const inVisibleWeek = (() => {
    for (let i = 0; i < 7; i++) {
      if (shiftLocalYmd(weekStartYmd, i, tz) === todayYmd) return true;
    }
    return false;
  })();
  const activeDayYmd =
    dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)
      ? dayParam
      : inVisibleWeek
      ? todayYmd
      : weekStartYmd;

  const dayBaseParts = [...weekBaseParts, `week=${weekStartYmd}`];
  const baseQueryForDay = dayBaseParts.join("&");

  // Where the mobile "show as list" link points — preserves siteId only.
  const listHref = (() => {
    const parts = [...baseQueryParts, "view=list"];
    return `?${parts.join("&")}`;
  })();

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Bookings</h1>
          <p className="mt-1 text-sm text-[#737373]">Your week at a glance.</p>
        </div>
        <NewBookingForm services={services ?? []} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ViewToggle active="week" baseQuery={baseQueryForToggle} />
        <WeekNav
          weekStartYmd={weekStartYmd}
          todayWeekStartYmd={todayWeekStartYmd}
          timeZone={tz}
          baseQuery={baseQueryForNav}
        />
      </div>

      {/* Desktop week grid */}
      <div className="mt-6 hidden md:block">
        <WeekView
          weekStartYmd={weekStartYmd}
          todayYmd={todayYmd}
          timeZone={tz}
          bookings={bookings}
        />
      </div>

      {/* Mobile day-tab fallback */}
      <div className="mt-6 block md:hidden">
        <DayView
          weekStartYmd={weekStartYmd}
          todayYmd={todayYmd}
          activeDayYmd={activeDayYmd}
          timeZone={tz}
          bookings={bookings}
          baseQuery={baseQueryForDay}
          listHref={listHref}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// LIST VIEW types + row component (preserved from prior implementation)
// ──────────────────────────────────────────────────────────────────

type ListBooking = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  paid_in_full_at: string | null;
  paid_amount_cents: number | null;
  stripe_payment_intent_id: string | null;
  services: { name: string | null; price_cents: number | null } | null;
  clients: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

type WeekBooking = {
  id: string;
  status: string;
  start_at: string;
  end_at: string;
  services: { name: string | null } | null;
  clients: { name: string | null } | null;
};

function BookingRow({ b }: { b: ListBooking }) {
  const start = new Date(b.start_at);
  const end = new Date(b.end_at);
  const dateLabel = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeLabel =
    start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) +
    " – " +
    end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // Phase 1.7: rows are now navigable to the per-booking detail page.
  // We use the absolute-link overlay pattern so the existing inline
  // contact anchors (mailto/tel/sms), the Refund deep-link, and the
  // Cancel button stay interactive — they sit in a `relative z-10`
  // stacking context above the absolute Link, so clicks on them never
  // trigger row navigation. Empty space anywhere on the card hits the
  // Link below and routes to /dashboard/bookings/{id}.
  return (
    <div className="relative flex flex-col gap-2 rounded-lg border border-[#E7E5E4] bg-white p-4 transition-colors hover:border-[#B8896B] md:flex-row md:items-center md:gap-6">
      <div className="flex-shrink-0 md:w-40">
        <p className="flex items-center gap-1.5 text-xs text-[#737373]">
          <Calendar size={11} /> {dateLabel}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-[#737373]">
          <Clock size={11} /> {timeLabel}
        </p>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{b.services?.name ?? "Service"}</p>
        <p className="text-xs text-[#737373]">
          {b.clients?.name ?? "Guest"}
          {b.services?.price_cents != null && ` · ${formatCents(b.services.price_cents)}`}
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-3 text-xs text-[#525252]">
        {b.clients?.email && (
          <a href={`mailto:${b.clients.email}`} className="flex items-center gap-1 hover:text-[#B8896B]">
            <Mail size={11} /> {b.clients.email}
          </a>
        )}
        {b.clients?.phone && (
          <div className="flex items-center gap-2">
            <a
              href={`tel:${b.clients.phone}`}
              className="flex items-center gap-1 hover:text-[#B8896B]"
              aria-label={`Call ${b.clients.phone}`}
            >
              <Phone size={11} /> {b.clients.phone}
            </a>
            <a
              href={`sms:${b.clients.phone}`}
              className="flex items-center gap-1 text-[11px] text-[#737373] hover:text-[#B8896B]"
              aria-label={`Text ${b.clients.phone}`}
              title="Send text message"
            >
              <MessageSquare size={11} /> Text
            </a>
          </div>
        )}
      </div>
      <div className="relative z-10 flex items-center gap-2">
        {b.paid_in_full_at && (
          <span
            className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
            title={`Paid ${b.paid_amount_cents ? formatCents(b.paid_amount_cents) : "in full"} on ${new Date(b.paid_in_full_at).toLocaleDateString()}`}
          >
            💳 Paid in full
          </span>
        )}
        {/* Refund deep-link. We don't process refunds in OYRB — direct
            charges live on the pro's connected account, so the link goes
            straight to the payment in their Stripe Dashboard. The pro
            must already be logged into that account for it to resolve. */}
        {b.stripe_payment_intent_id && (
          <a
            href={`https://dashboard.stripe.com/payments/${b.stripe_payment_intent_id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open this payment in your Stripe Dashboard to issue a refund"
            className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E4] bg-white px-2.5 py-1 text-[10px] font-medium text-[#525252] hover:border-[#B8896B] hover:text-[#0A0A0A]"
          >
            Refund <ExternalLink size={10} />
          </a>
        )}
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
            b.status === "confirmed" ? "bg-green-50 text-green-700" :
            b.status === "cancelled" ? "bg-red-50 text-red-700" :
            b.status === "completed" ? "bg-blue-50 text-blue-700" :
            "bg-amber-50 text-amber-700"
          }`}
        >
          {b.status}
        </span>
        {b.status === "confirmed" && new Date(b.start_at) > new Date() && (
          <CancelBookingButton bookingId={b.id} />
        )}
      </div>
      {/* Row-level navigation overlay (Phase 1.7). Absolute-positioned
          link sits above the non-interactive text but below the
          relative-z-10 action containers above, so clicks on contact
          anchors / refund link / cancel button hit those targets while
          clicks on empty space route to the detail page. */}
      <Link
        href={`/dashboard/bookings/${b.id}`}
        aria-label={`View booking · ${b.services?.name ?? "service"} with ${b.clients?.name ?? "client"}`}
        className="absolute inset-0 rounded-lg"
      />
    </div>
  );
}
