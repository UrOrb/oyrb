// Business Brain analytics aggregation (Phase 4.1).
//
// This file is the data layer for the "This Week" tab. Future tabs
// (4.2 Money / 4.3 Time / 4.4 Clients / 4.5 Where They Come From)
// will add their own aggregation helpers in here, keeping all
// Business Brain queries in one place.
//
// Patterns mirrored from src/lib/reputation-stats.ts (PR #27):
//   - unstable_cache wrapper with 1-hour TTL keyed on businessId
//   - single source-of-truth aggregator returning a typed snapshot
//   - graceful null/empty handling — never throw to the UI
//
// Stale-window caveat (1-hour cache): a booking made just now won't
// appear in This Week for up to 60 minutes. Acceptable since this is
// reflective analytics, not real-time ops. The booking detail page
// (uncached) is where pros go for live state.

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

// ── Types ────────────────────────────────────────────────────────────

export type DensityDay = {
  /** "Mon" / "Tue" / etc. */
  label: string;
  /** "May 5" — short human-readable date in pro's tz. */
  dateLocal: string;
  /** Confirmed + completed bookings for this day. Cancelled excluded. */
  bookingCount: number;
  isToday: boolean;
  isPast: boolean;
};

export type TodayService = {
  id: string;
  clientName: string;
  serviceName: string;
  startAt: Date;
  endAt: Date;
  status: string;
  serviceStartedAt: Date | null;
  serviceEndedAt: Date | null;
  /** Derived display state. Falls back to "scheduled" when timing data is absent. */
  progressLabel: "scheduled" | "in_progress" | "complete" | "cancelled" | "past";
};

/**
 * Four mutually-exclusive payment patterns. Per booking, exactly one of
 * these applies. Reused by the This Week tab's Money card and the
 * Phase 4.2 Money tab's Deposit-vs-Pay-in-Full card so pros see a
 * consistent payment-pattern model across both surfaces.
 *
 *   - fullyUpfront        : deposit_paid=false AND paid_in_full_at NOT NULL
 *                           (client paid full price via the pay-in-full
 *                           flow). paid_amount_cents holds the full price.
 *   - depositThenBalance  : deposit_paid=true AND paid_in_full_at NOT NULL
 *                           (client paid deposit at booking, then balance
 *                           via the pay-in-full flow).
 *                           paid_amount_cents holds ONLY the balance —
 *                           total collected = deposit_cents + paid_amount_cents.
 *   - depositOnly         : deposit_paid=true AND paid_in_full_at NULL
 *                           (deposit collected; balance owed in person
 *                           or never collected through OYRB).
 *   - noOyrbPayment       : both NULL/false (paid in person, free
 *                           service, or pending). Counted but $0
 *                           collected — there's nothing for OYRB to sum.
 */
export type PaymentMix = {
  fullyUpfrontCount: number;
  fullyUpfrontCents: number;
  depositThenBalanceCount: number;
  depositThenBalanceCents: number;
  depositOnlyCount: number;
  depositOnlyCents: number;
  noOyrbPaymentCount: number;
  totalBookings: number;
  totalCollectedCents: number;
};

/**
 * The canonical money summary. Same shape used by both This Week's
 * Money card and the 90-day window in the Money tab. Replaces the
 * deposits/payInFull split from PR #29 — that framing under-counted
 * revenue when a deposit + balance were both paid (paid_amount_cents
 * holds only the balance, not the full price). The new shape sums
 * each booking's collected revenue once.
 */
export type MoneyThisWeek = {
  /** Sum of services.price_cents for non-cancelled bookings in window. "Money on the calendar" — what appointments are worth, not what was actually collected. */
  grossCents: number;
  /** Sum of OYRB-captured revenue for non-cancelled bookings in window. Per booking: (deposit_cents if deposit_paid) + (paid_amount_cents if paid_in_full_at). Equals 0 for pros not using Stripe Connect / pay-in-full — they collect outside OYRB. */
  revenueCollectedCents: number;
  /** 4-category payment-pattern breakdown for the same set of bookings. */
  paymentMix: PaymentMix;
};

export type TrendCompare = {
  bookingsThisWeek: number;
  bookingsLastWeek: number;
  grossThisWeekCents: number;
  grossLastWeekCents: number;
  /** completed / (completed + pro-cancelled). null when denominator is 0 (e.g. no resolved bookings yet that week). */
  completionRateThisWeek: number | null;
  completionRateLastWeek: number | null;
};

export type ThisWeekData = {
  weekStart: Date;
  weekEnd: Date;
  today: Date;
  timeZone: string;
  density: DensityDay[];
  todayServices: TodayService[];
  money: MoneyThisWeek;
  trend: TrendCompare;
};

export type AnomalyType = "heavy_week" | "three_day_gap" | "quick_service";

export type Anomaly = {
  type: AnomalyType;
  /** Headline, shown verbatim on the Heads-up card. */
  message: string;
  /** Optional secondary context, shown smaller below the message. */
  detail?: string;
};

export type AnomalyResult = {
  anomalies: Anomaly[];
  /**
   * False when NO anomaly rule has enough sample-size to even evaluate
   * (e.g., business < 4 weeks old). UI uses this to switch between the
   * "Building baseline" empty state and "Nothing unusual" empty state.
   */
  baselineReady: boolean;
};

// ── Constants ────────────────────────────────────────────────────────

const HEAVY_WEEK_REQUIRED_PRIOR_WEEKS = 4;
const HEAVY_WEEK_MULTIPLIER = 1.5;
const GAP_REQUIRED_DAYS_OF_HISTORY = 30;
const GAP_THRESHOLD_DAYS = 3;
const QUICK_SERVICE_REQUIRED_PRIOR_COMPLETIONS = 10;
/** A service is "quick" when it ran for ≤ this fraction of its scheduled duration. */
const QUICK_SERVICE_RATIO = 0.5;

// ── Date helpers ─────────────────────────────────────────────────────

/**
 * Compute the start (Monday 00:00) and end (next Monday 00:00,
 * exclusive) of the current week in the given timezone, plus today's
 * local-day start. Returns Date instants in UTC.
 *
 * DST note: we probe the offset at noon-Monday-local (when DST is
 * unambiguous) and use that for both boundaries. A week containing a
 * spring-forward / fall-back will have boundaries off by at most one
 * hour. Acceptable for analytics bucketing.
 */
export function getWeekRange(timeZone: string): {
  weekStart: Date;
  weekEnd: Date;
  today: Date;
  todayWeekdayIndex: number;
} {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  // Mon=0 ... Sun=6
  const weekdayMap: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  const todayWeekdayIndex = weekdayMap[parts.weekday] ?? 0;

  const todayY = Number(parts.year);
  const todayM = Number(parts.month);
  const todayD = Number(parts.day);

  // Monday's local Y-M-D.
  const todayUtcMidday = new Date(Date.UTC(todayY, todayM - 1, todayD, 12));
  const mondayUtcMidday = new Date(todayUtcMidday);
  mondayUtcMidday.setUTCDate(todayUtcMidday.getUTCDate() - todayWeekdayIndex);

  const mondayY = mondayUtcMidday.getUTCFullYear();
  const mondayM = mondayUtcMidday.getUTCMonth();
  const mondayD = mondayUtcMidday.getUTCDate();

  // Probe tz offset at Monday noon local (DST-stable point).
  const offsetMin = getTzOffsetMinutes(mondayUtcMidday, timeZone);

  const weekStart = new Date(
    Date.UTC(mondayY, mondayM, mondayD, 0) - offsetMin * 60_000,
  );
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const today = new Date(
    Date.UTC(todayY, todayM - 1, todayD, 0) - offsetMin * 60_000,
  );

  return { weekStart, weekEnd, today, todayWeekdayIndex };
}

/**
 * Returns the offset (in minutes) of `timeZone` from UTC at the given
 * instant. Positive for east of UTC, negative for west. Uses a parser
 * round-trip through Intl.DateTimeFormat — no library needed.
 */
function getTzOffsetMinutes(date: Date, timeZone: string): number {
  const parse = (locale: string, tz: string): number => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(date).map((p) => [p.type, p.value]),
    ) as Record<string, string>;
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) === 24 ? 0 : Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
  };
  const utcAsLocal = parse("UTC", "UTC");
  const tzAsLocal = parse("tz", timeZone);
  return (tzAsLocal - utcAsLocal) / 60_000;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Aggregate everything the This Week tab needs in one batch. Cached
 * for 1 hour per businessId.
 *
 * Pass the business's timezone (defaulting to UTC if absent) so week
 * boundaries match what the pro thinks "this week" means.
 */
export async function getThisWeekData(
  businessId: string,
  timeZone: string,
): Promise<ThisWeekData> {
  return unstable_cache(
    async () => computeThisWeekData(businessId, timeZone),
    ["business-brain-this-week", businessId, timeZone],
    { revalidate: 3600 },
  )();
}

export async function detectAnomalies(
  businessId: string,
  timeZone: string,
): Promise<AnomalyResult> {
  return unstable_cache(
    async () => computeAnomalies(businessId, timeZone),
    ["business-brain-anomalies", businessId, timeZone],
    { revalidate: 3600 },
  )();
}

// ── Implementation: ThisWeekData ─────────────────────────────────────

type BookingForWeek = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  cancelled_by: string | null;
  deposit_paid: boolean | null;
  paid_in_full_at: string | null;
  paid_amount_cents: number | null;
  service_started_at: string | null;
  service_ended_at: string | null;
  client_id: string | null;
  services: { name: string; price_cents: number; deposit_cents: number } | { name: string; price_cents: number; deposit_cents: number }[] | null;
  clients: { name: string } | { name: string }[] | null;
};

async function computeThisWeekData(
  businessId: string,
  timeZone: string,
): Promise<ThisWeekData> {
  const admin = createAdminClient();
  const { weekStart, weekEnd, today } = getWeekRange(timeZone);

  // Last week is the 7 days immediately before this week.
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekEnd = weekStart;

  // Today's local-day window: today 00:00 to today + 24h, both in tz.
  const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Pull this-week bookings (for density + money + trend) and last-week
  // bookings (for trend) in two batched queries. Pull today's separately
  // with the joins we need for the Today's services card — keeps the
  // payload tight on weeks with many bookings.
  const [thisWeekRes, lastWeekRes, todayRes] = await Promise.all([
    admin
      .from("bookings")
      .select(
        "id, start_at, end_at, status, cancelled_by, deposit_paid, paid_in_full_at, paid_amount_cents, services(price_cents, deposit_cents)",
      )
      .eq("business_id", businessId)
      .gte("start_at", weekStart.toISOString())
      .lt("start_at", weekEnd.toISOString()),
    admin
      .from("bookings")
      .select("id, status, cancelled_by, services(price_cents)")
      .eq("business_id", businessId)
      .gte("start_at", lastWeekStart.toISOString())
      .lt("start_at", lastWeekEnd.toISOString()),
    admin
      .from("bookings")
      .select(
        "id, start_at, end_at, status, service_started_at, service_ended_at, services(name), clients(name)",
      )
      .eq("business_id", businessId)
      .gte("start_at", today.toISOString())
      .lt("start_at", todayEnd.toISOString())
      .order("start_at", { ascending: true }),
  ]);

  const thisWeekRows = (thisWeekRes.data ?? []) as Array<
    Pick<
      BookingForWeek,
      | "id"
      | "start_at"
      | "end_at"
      | "status"
      | "cancelled_by"
      | "deposit_paid"
      | "paid_in_full_at"
      | "paid_amount_cents"
      | "services"
    >
  >;

  // ── Schedule density (Mon-Sun) ─────────────────────────────────────
  const density = buildDensity({
    timeZone,
    weekStart,
    today,
    rows: thisWeekRows.map((r) => ({
      start_at: r.start_at,
      status: r.status,
    })),
  });

  // ── Money this week ────────────────────────────────────────────────
  const money: MoneyThisWeek = aggregateMoney(
    thisWeekRows.filter((r) => r.status !== "cancelled").map((r) => ({
      depositPaid: !!r.deposit_paid,
      paidInFullAt: r.paid_in_full_at,
      paidAmountCents: r.paid_amount_cents ?? 0,
      priceCents: pickFirst(r.services)?.price_cents ?? 0,
      depositCents: pickFirst(r.services)?.deposit_cents ?? 0,
    })),
  );

  // ── Trend compare ──────────────────────────────────────────────────
  const lastWeekRows = (lastWeekRes.data ?? []) as Array<{
    id: string;
    status: string;
    cancelled_by: string | null;
    services: { price_cents: number } | { price_cents: number }[] | null;
  }>;

  const trend: TrendCompare = {
    bookingsThisWeek: thisWeekRows.filter((r) => r.status !== "cancelled").length,
    bookingsLastWeek: lastWeekRows.filter((r) => r.status !== "cancelled").length,
    grossThisWeekCents: money.grossCents,
    grossLastWeekCents: lastWeekRows.reduce((sum, r) => {
      if (r.status === "cancelled") return sum;
      const svc = pickFirst(r.services);
      return sum + (svc?.price_cents ?? 0);
    }, 0),
    completionRateThisWeek: completionRate(thisWeekRows),
    completionRateLastWeek: completionRate(lastWeekRows),
  };

  // ── Today's services ───────────────────────────────────────────────
  const todayRows = (todayRes.data ?? []) as Array<{
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    service_started_at: string | null;
    service_ended_at: string | null;
    services: { name: string } | { name: string }[] | null;
    clients: { name: string } | { name: string }[] | null;
  }>;

  const nowMs = Date.now();
  const todayServices: TodayService[] = todayRows.map((r) => {
    const svc = pickFirst(r.services);
    const cli = pickFirst(r.clients);
    const startMs = new Date(r.start_at).getTime();
    const endMs = new Date(r.end_at).getTime();
    const serviceStartedAt = r.service_started_at ? new Date(r.service_started_at) : null;
    const serviceEndedAt = r.service_ended_at ? new Date(r.service_ended_at) : null;

    let progressLabel: TodayService["progressLabel"] = "scheduled";
    if (r.status === "cancelled") progressLabel = "cancelled";
    else if (r.status === "completed") progressLabel = "complete";
    else if (serviceEndedAt) progressLabel = "complete";
    else if (serviceStartedAt && !serviceEndedAt) progressLabel = "in_progress";
    else if (endMs < nowMs) progressLabel = "past"; // ended scheduled time, no Phase 3 ping

    return {
      id: r.id,
      clientName: cli?.name ?? "Client",
      serviceName: svc?.name ?? "Service",
      startAt: new Date(r.start_at),
      endAt: new Date(r.end_at),
      status: r.status,
      serviceStartedAt,
      serviceEndedAt,
      progressLabel,
    };
  });

  return {
    weekStart,
    weekEnd,
    today,
    timeZone,
    density,
    todayServices,
    money,
    trend,
  };
}

// ── Density helper ───────────────────────────────────────────────────

function buildDensity(args: {
  timeZone: string;
  weekStart: Date;
  today: Date;
  rows: Array<{ start_at: string; status: string }>;
}): DensityDay[] {
  const { timeZone, weekStart, today, rows } = args;
  const dayMs = 24 * 60 * 60 * 1000;
  const todayKey = formatLocalKey(today, timeZone);

  // Pre-bucket by local date string.
  const bucket = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const key = formatLocalKey(new Date(r.start_at), timeZone);
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const out: DensityDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(weekStart.getTime() + i * dayMs);
    const key = formatLocalKey(day, timeZone);
    const isToday = key === todayKey;
    const isPast = day.getTime() < today.getTime() && !isToday;
    out.push({
      label: labels[i],
      dateLocal: formatLocalShort(day, timeZone),
      bookingCount: bucket.get(key) ?? 0,
      isToday,
      isPast,
    });
  }
  return out;
}

function formatLocalKey(d: Date, tz: string): string {
  // YYYY-MM-DD in target tz — used as a bucket key.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

function formatLocalShort(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
  }).format(d);
}

// ── Helpers ──────────────────────────────────────────────────────────

function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function completionRate(rows: Array<{ status: string; cancelled_by: string | null }>): number | null {
  const completed = rows.filter((r) => r.status === "completed").length;
  const proCancelled = rows.filter(
    (r) => r.status === "cancelled" && r.cancelled_by === "pro",
  ).length;
  const denom = completed + proCancelled;
  if (denom === 0) return null;
  return completed / denom;
}

// ── Implementation: anomalies ────────────────────────────────────────

async function computeAnomalies(
  businessId: string,
  timeZone: string,
): Promise<AnomalyResult> {
  const admin = createAdminClient();
  const { weekStart, weekEnd, today } = getWeekRange(timeZone);

  // Pull bookings for the last 35 days + this + next week. Single
  // query feeds all three rules; in-memory bucketing is cheap at
  // OYRB's current scale.
  const lookbackStart = new Date(
    weekStart.getTime() - HEAVY_WEEK_REQUIRED_PRIOR_WEEKS * 7 * 24 * 60 * 60 * 1000,
  );
  const lookaheadEnd = new Date(
    weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const [recentRes, firstRes, completionsRes] = await Promise.all([
    admin
      .from("bookings")
      .select("start_at, status, service_started_at, service_ended_at, services(duration_minutes)")
      .eq("business_id", businessId)
      .gte("start_at", lookbackStart.toISOString())
      .lt("start_at", lookaheadEnd.toISOString()),
    // Sample-size guard for "three day gap": needs ≥30 days since
    // first booking ever.
    admin
      .from("bookings")
      .select("start_at")
      .eq("business_id", businessId)
      .order("start_at", { ascending: true })
      .limit(1),
    // Sample-size guard for "quick service": prior completions with
    // BOTH timing pings present (service_ended_at NOT NULL implies
    // service_started_at NOT NULL by API contract from PR #28).
    admin
      .from("bookings")
      .select("service_started_at, service_ended_at, services(duration_minutes)")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .not("service_ended_at", "is", null)
      .lt("end_at", weekStart.toISOString())
      .order("end_at", { ascending: false })
      .limit(50),
  ]);

  type RecentRow = {
    start_at: string;
    status: string;
    service_started_at: string | null;
    service_ended_at: string | null;
    services: { duration_minutes: number } | { duration_minutes: number }[] | null;
  };
  const recentRows = (recentRes.data ?? []) as RecentRow[];

  const anomalies: Anomaly[] = [];
  const guards = {
    heavyWeek: false,
    threeDayGap: false,
    quickService: false,
  };

  // ── Heavy week ─────────────────────────────────────────────────────
  // Bucket bookings by week-offset relative to weekStart. Skip cancelled.
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  const weekBuckets = new Map<number, number>();
  for (const r of recentRows) {
    if (r.status === "cancelled") continue;
    const offsetWeeks = Math.floor(
      (new Date(r.start_at).getTime() - weekStart.getTime()) / weekMs,
    );
    weekBuckets.set(offsetWeeks, (weekBuckets.get(offsetWeeks) ?? 0) + 1);
  }
  // Prior weeks: -1 through -HEAVY_WEEK_REQUIRED_PRIOR_WEEKS
  let priorWeeksWithData = 0;
  let priorTotal = 0;
  for (let i = 1; i <= HEAVY_WEEK_REQUIRED_PRIOR_WEEKS; i += 1) {
    const count = weekBuckets.get(-i);
    if (count !== undefined) priorWeeksWithData += 1;
    priorTotal += count ?? 0;
  }
  if (priorWeeksWithData >= HEAVY_WEEK_REQUIRED_PRIOR_WEEKS) {
    guards.heavyWeek = true;
    const avg = priorTotal / HEAVY_WEEK_REQUIRED_PRIOR_WEEKS;
    const thisWeekCount = weekBuckets.get(0) ?? 0;
    if (avg > 0 && thisWeekCount > avg * HEAVY_WEEK_MULTIPLIER) {
      anomalies.push({
        type: "heavy_week",
        message: `Heavy week ahead — ${thisWeekCount} booking${thisWeekCount === 1 ? "" : "s"} vs your usual ${formatAvg(avg)}.`,
      });
    }
  }

  // ── Three-day gap ─────────────────────────────────────────────────
  const firstRow = (firstRes.data ?? [])[0] as { start_at: string } | undefined;
  if (firstRow) {
    const ageDays = (Date.now() - new Date(firstRow.start_at).getTime()) / dayMs;
    if (ageDays >= GAP_REQUIRED_DAYS_OF_HISTORY) {
      guards.threeDayGap = true;
      // Look at this week + next week (14 days from weekStart). Find the
      // longest run of consecutive zero-booking days starting from today.
      const dayBuckets = new Array<number>(14).fill(0);
      for (const r of recentRows) {
        if (r.status === "cancelled") continue;
        const offsetDays = Math.floor(
          (new Date(r.start_at).getTime() - weekStart.getTime()) / dayMs,
        );
        if (offsetDays >= 0 && offsetDays < 14) {
          dayBuckets[offsetDays] += 1;
        }
      }
      const todayOffset = Math.floor((today.getTime() - weekStart.getTime()) / dayMs);
      let runStart = -1;
      let runLen = 0;
      let bestStart = -1;
      let bestLen = 0;
      for (let i = Math.max(0, todayOffset); i < 14; i += 1) {
        if (dayBuckets[i] === 0) {
          if (runLen === 0) runStart = i;
          runLen += 1;
          if (runLen > bestLen) {
            bestLen = runLen;
            bestStart = runStart;
          }
        } else {
          runLen = 0;
        }
      }
      if (bestLen >= GAP_THRESHOLD_DAYS && bestStart >= 0) {
        const gapStartDate = new Date(weekStart.getTime() + bestStart * dayMs);
        anomalies.push({
          type: "three_day_gap",
          message: `Open stretch — ${bestLen} consecutive days with no bookings starting ${formatLocalShort(gapStartDate, timeZone)}.`,
          detail: "Could be a window for marketing pushes or batch admin work.",
        });
      }
    }
  }

  // ── Quick service ─────────────────────────────────────────────────
  type CompletionRow = {
    service_started_at: string | null;
    service_ended_at: string | null;
    services: { duration_minutes: number } | { duration_minutes: number }[] | null;
  };
  const completions = (completionsRes.data ?? []) as CompletionRow[];
  if (completions.length >= QUICK_SERVICE_REQUIRED_PRIOR_COMPLETIONS) {
    guards.quickService = true;

    // Look for a THIS-WEEK booking with both pings AND actual duration
    // ≤ QUICK_SERVICE_RATIO × scheduled. Most-recent first surfaces the
    // freshest signal.
    const thisWeekCompletions = recentRows
      .filter((r) => {
        const offsetDays = (new Date(r.start_at).getTime() - weekStart.getTime()) / dayMs;
        return offsetDays >= 0 && offsetDays < 7;
      })
      .filter((r) => r.service_started_at && r.service_ended_at)
      .sort((a, b) =>
        new Date(b.service_ended_at!).getTime() - new Date(a.service_ended_at!).getTime(),
      );

    for (const r of thisWeekCompletions) {
      const startMs = new Date(r.service_started_at!).getTime();
      const endMs = new Date(r.service_ended_at!).getTime();
      const actualMin = Math.max(0, (endMs - startMs) / 60_000);
      const svc = pickFirst(r.services);
      const scheduledMin = svc?.duration_minutes ?? 0;
      if (scheduledMin > 0 && actualMin <= scheduledMin * QUICK_SERVICE_RATIO) {
        anomalies.push({
          type: "quick_service",
          message: `Quick service this week — ${Math.round(actualMin)} min vs ${scheduledMin} min scheduled.`,
          detail: "Could mean an early walkout, a service swap, or just an efficient session — worth a glance.",
        });
        break;
      }
    }
  }

  const baselineReady =
    guards.heavyWeek || guards.threeDayGap || guards.quickService;

  return { anomalies, baselineReady };
}

function formatAvg(n: number): string {
  return n >= 10 ? Math.round(n).toString() : n.toFixed(1);
}

// ────────────────────────────────────────────────────────────────────
// Phase 4.2 — Money tab
// ────────────────────────────────────────────────────────────────────

const MONEY_WINDOW_LAST_30 = 30;
const MONEY_WINDOW_LAST_90 = 90;
const MONEY_TREND_TARGET_WEEKS = 12;
const MONEY_TREND_MIN_WEEKS = 4;
const TOP_SERVICES_REQUIRED_DISTINCT = 3;
const TOP_SERVICES_LIMIT = 5;
const PROFIT_PER_MINUTE_MIN_BOOKINGS = 5;
const MS_DAY = 24 * 60 * 60 * 1000;

export type RevenueWindow = {
  /** "This week" / "This month" / "Last 30 days" / "Last 90 days". */
  label: string;
  /** Window in absolute time (UTC instants). */
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  bookingCount: number;
  prevBookingCount: number;
  grossCents: number;
  prevGrossCents: number;
  /** Optional descriptive note, e.g., "Compared at same day-of-month." Used on the This Month tile only. */
  comparisonNote?: string;
};

export type TopService = {
  serviceId: string;
  name: string;
  totalRevenueCents: number;
  bookingCount: number;
  avgPriceCents: number;
};

export type WeeklyRevenuePoint = {
  /** Monday in pro tz. */
  weekStart: Date;
  /** Short label e.g. "May 5". */
  label: string;
  grossCents: number;
};

export type MoneyTrend = {
  /** True when ≥ MONEY_TREND_MIN_WEEKS of data is available; controls empty state. */
  hasEnoughData: boolean;
  points: WeeklyRevenuePoint[];
};

export type ProfitPerMinute = {
  /** True when ≥ PROFIT_PER_MINUTE_MIN_BOOKINGS qualifying bookings; controls empty state. */
  hasEnoughData: boolean;
  qualifyingBookings: number;
  totalRevenueCents: number;
  totalMinutes: number;
  /** Cents per minute. 0 when totalMinutes is 0 (defensive — shouldn't happen when hasEnoughData is true). */
  centsPerMinute: number;
};

export type MoneyData = {
  timeZone: string;
  /** [thisWeek, thisMonth, last30, last90]. */
  windows: RevenueWindow[];
  topServices: TopService[];
  topServicesHasEnoughData: boolean;
  /** 90-day payment-pattern breakdown. */
  paymentMix: PaymentMix;
  trend: MoneyTrend;
  profitPerMinute: ProfitPerMinute;
};

export async function getMoneyData(
  businessId: string,
  timeZone: string,
): Promise<MoneyData> {
  return unstable_cache(
    async () => computeMoneyData(businessId, timeZone),
    ["business-brain-money", businessId, timeZone],
    { revalidate: 3600 },
  )();
}

/**
 * Shared aggregator. Takes a flat array of bookings (already filtered
 * to the relevant window and to non-cancelled status) and returns the
 * canonical money summary used by both This Week's Money card and the
 * Money tab's 90-day breakdown.
 *
 * Per-booking collected revenue:
 *   (deposit_cents if deposit_paid) + (paid_amount_cents if paid_in_full_at)
 *
 * This sums each booking's actual flow-of-funds exactly once. A
 * deposit-then-balance booking contributes deposit_cents +
 * paid_amount_cents (which equals the full price). A deposit-only
 * booking contributes only deposit_cents. A no-OYRB-payment booking
 * contributes 0.
 */
type MoneyInput = {
  depositPaid: boolean;
  paidInFullAt: string | null;
  paidAmountCents: number;
  priceCents: number;
  depositCents: number;
};

function aggregateMoney(rows: MoneyInput[]): MoneyThisWeek {
  let grossCents = 0;
  let revenueCollectedCents = 0;
  const mix: PaymentMix = {
    fullyUpfrontCount: 0,
    fullyUpfrontCents: 0,
    depositThenBalanceCount: 0,
    depositThenBalanceCents: 0,
    depositOnlyCount: 0,
    depositOnlyCents: 0,
    noOyrbPaymentCount: 0,
    totalBookings: 0,
    totalCollectedCents: 0,
  };

  for (const r of rows) {
    grossCents += r.priceCents;
    mix.totalBookings += 1;

    const collected =
      (r.depositPaid ? r.depositCents : 0) +
      (r.paidInFullAt ? r.paidAmountCents : 0);
    revenueCollectedCents += collected;

    if (!r.depositPaid && r.paidInFullAt) {
      mix.fullyUpfrontCount += 1;
      mix.fullyUpfrontCents += collected;
    } else if (r.depositPaid && r.paidInFullAt) {
      mix.depositThenBalanceCount += 1;
      mix.depositThenBalanceCents += collected;
    } else if (r.depositPaid && !r.paidInFullAt) {
      mix.depositOnlyCount += 1;
      mix.depositOnlyCents += collected;
    } else {
      mix.noOyrbPaymentCount += 1;
    }
  }

  mix.totalCollectedCents = revenueCollectedCents;
  return { grossCents, revenueCollectedCents, paymentMix: mix };
}

/**
 * Calendar-month boundaries in the pro's tz. Returns:
 *   - monthStart       : 1st of this month, 00:00 in tz, as UTC instant
 *   - monthSoFarEnd    : start of tomorrow in tz, as UTC instant (so today
 *                        is fully included in the "this month so far" range)
 *   - lastMonthStart   : 1st of last month, 00:00 in tz
 *   - lastMonthMatchEnd: last month's start + (monthSoFarEnd - monthStart),
 *                        i.e., the same number of days into last month —
 *                        gives a fair partial-month comparison.
 */
function getMonthRanges(timeZone: string): {
  monthStart: Date;
  monthSoFarEnd: Date;
  lastMonthStart: Date;
  lastMonthMatchEnd: Date;
} {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const y = Number(parts.year);
  const m = Number(parts.month); // 1-12
  const d = Number(parts.day);

  // Use noon-on-the-1st as the DST-stable probe point.
  const probeMonth = new Date(Date.UTC(y, m - 1, 1, 12));
  const offsetMin = getTzOffsetMinutes(probeMonth, timeZone);
  const probeLastMonth = new Date(
    Date.UTC(y, m - 2, 1, 12),
  );
  const offsetLastMin = getTzOffsetMinutes(probeLastMonth, timeZone);

  const monthStart = new Date(
    Date.UTC(y, m - 1, 1, 0) - offsetMin * 60_000,
  );
  // "today + 1" in tz. Spring-forward weeks: the end is at most 1h off,
  // matching the spring-forward concession in getWeekRange.
  const monthSoFarEnd = new Date(
    Date.UTC(y, m - 1, d + 1, 0) - offsetMin * 60_000,
  );

  const lastMonthStart = new Date(
    Date.UTC(y, m - 2, 1, 0) - offsetLastMin * 60_000,
  );
  // Same number of days into last month.
  const daysIntoMonth = Math.round(
    (monthSoFarEnd.getTime() - monthStart.getTime()) / MS_DAY,
  );
  const lastMonthMatchEnd = new Date(
    Date.UTC(y, m - 2, 1 + daysIntoMonth, 0) - offsetLastMin * 60_000,
  );

  return { monthStart, monthSoFarEnd, lastMonthStart, lastMonthMatchEnd };
}

type MoneyRow = {
  id: string;
  start_at: string;
  status: string;
  deposit_paid: boolean | null;
  paid_in_full_at: string | null;
  paid_amount_cents: number | null;
  service_started_at: string | null;
  service_ended_at: string | null;
  service_id: string | null;
  services:
    | { id: string; name: string; price_cents: number; deposit_cents: number }
    | { id: string; name: string; price_cents: number; deposit_cents: number }[]
    | null;
};

async function computeMoneyData(
  businessId: string,
  timeZone: string,
): Promise<MoneyData> {
  const admin = createAdminClient();
  const now = new Date();
  const { weekStart, weekEnd } = getWeekRange(timeZone);
  const { monthStart, monthSoFarEnd, lastMonthStart, lastMonthMatchEnd } =
    getMonthRanges(timeZone);

  const last30Start = new Date(now.getTime() - MONEY_WINDOW_LAST_30 * MS_DAY);
  const prev30Start = new Date(now.getTime() - 2 * MONEY_WINDOW_LAST_30 * MS_DAY);
  const last90Start = new Date(now.getTime() - MONEY_WINDOW_LAST_90 * MS_DAY);
  const prev90Start = new Date(now.getTime() - 2 * MONEY_WINDOW_LAST_90 * MS_DAY);

  // Trend chart needs up to 12 weeks back from the start of THIS week.
  const trendStart = new Date(
    weekStart.getTime() - MONEY_TREND_TARGET_WEEKS * 7 * MS_DAY,
  );

  // Widest range we need: max of (prev90Start, lastMonthStart, trendStart)
  // through weekEnd.
  const widestStart = new Date(
    Math.min(prev90Start.getTime(), lastMonthStart.getTime(), trendStart.getTime()),
  );

  const { data } = await admin
    .from("bookings")
    .select(
      "id, start_at, status, deposit_paid, paid_in_full_at, paid_amount_cents, service_started_at, service_ended_at, service_id, services(id, name, price_cents, deposit_cents)",
    )
    .eq("business_id", businessId)
    .gte("start_at", widestStart.toISOString())
    .lt("start_at", weekEnd.toISOString());

  const allRows = ((data ?? []) as MoneyRow[]).filter(
    (r) => r.status !== "cancelled",
  );

  const inWindow = (
    rows: MoneyRow[],
    start: Date,
    end: Date,
  ): MoneyRow[] => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return rows.filter((r) => {
      const t = new Date(r.start_at).getTime();
      return t >= startMs && t < endMs;
    });
  };

  const toMoneyInputs = (rows: MoneyRow[]): MoneyInput[] =>
    rows.map((r) => {
      const svc = pickFirst(r.services);
      return {
        depositPaid: !!r.deposit_paid,
        paidInFullAt: r.paid_in_full_at,
        paidAmountCents: r.paid_amount_cents ?? 0,
        priceCents: svc?.price_cents ?? 0,
        depositCents: svc?.deposit_cents ?? 0,
      };
    });

  const buildWindow = (
    label: string,
    start: Date,
    end: Date,
    prevStart: Date,
    prevEnd: Date,
    comparisonNote?: string,
  ): RevenueWindow => {
    const cur = inWindow(allRows, start, end);
    const prev = inWindow(allRows, prevStart, prevEnd);
    const curMoney = aggregateMoney(toMoneyInputs(cur));
    const prevMoney = aggregateMoney(toMoneyInputs(prev));
    return {
      label,
      start,
      end,
      prevStart,
      prevEnd,
      bookingCount: cur.length,
      prevBookingCount: prev.length,
      grossCents: curMoney.grossCents,
      prevGrossCents: prevMoney.grossCents,
      comparisonNote,
    };
  };

  // Last week boundaries for the This Week tile's prev period.
  const lastWeekStart = new Date(weekStart.getTime() - 7 * MS_DAY);
  const lastWeekEnd = weekStart;

  const windows: RevenueWindow[] = [
    buildWindow("This week", weekStart, weekEnd, lastWeekStart, lastWeekEnd),
    buildWindow(
      "This month",
      monthStart,
      monthSoFarEnd,
      lastMonthStart,
      lastMonthMatchEnd,
      "Compared at same day-of-month",
    ),
    buildWindow("Last 30 days", last30Start, now, prev30Start, last30Start),
    buildWindow("Last 90 days", last90Start, now, prev90Start, last90Start),
  ];

  // ── Top services (90 days) ──────────────────────────────────────────
  const last90Rows = inWindow(allRows, last90Start, now);
  const byService = new Map<
    string,
    { name: string; total: number; count: number }
  >();
  for (const r of last90Rows) {
    if (!r.service_id) continue;
    const svc = pickFirst(r.services);
    if (!svc) continue;
    const existing = byService.get(r.service_id);
    if (existing) {
      existing.total += svc.price_cents;
      existing.count += 1;
    } else {
      byService.set(r.service_id, {
        name: svc.name,
        total: svc.price_cents,
        count: 1,
      });
    }
  }
  const topServices: TopService[] = Array.from(byService.entries())
    .map(([serviceId, v]) => ({
      serviceId,
      name: v.name,
      totalRevenueCents: v.total,
      bookingCount: v.count,
      avgPriceCents: v.count > 0 ? Math.round(v.total / v.count) : 0,
    }))
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)
    .slice(0, TOP_SERVICES_LIMIT);
  const topServicesHasEnoughData = byService.size >= TOP_SERVICES_REQUIRED_DISTINCT;

  // ── Payment mix (90 days) ──────────────────────────────────────────
  const paymentMix = aggregateMoney(toMoneyInputs(last90Rows)).paymentMix;

  // ── Money trend chart ──────────────────────────────────────────────
  // Compute the past N weeks (up to 12) including this week. Earliest
  // first. A pro with < 4 weeks of data shows the empty state.
  const trendPoints: WeeklyRevenuePoint[] = [];
  for (let i = MONEY_TREND_TARGET_WEEKS - 1; i >= 0; i -= 1) {
    const wkStart = new Date(weekStart.getTime() - i * 7 * MS_DAY);
    const wkEnd = new Date(wkStart.getTime() + 7 * MS_DAY);
    const rows = inWindow(allRows, wkStart, wkEnd);
    const wkMoney = aggregateMoney(toMoneyInputs(rows));
    trendPoints.push({
      weekStart: wkStart,
      label: new Intl.DateTimeFormat("en-US", {
        timeZone,
        month: "short",
        day: "numeric",
      }).format(wkStart),
      grossCents: wkMoney.grossCents,
    });
  }
  // Trim leading zero-revenue weeks beyond the first non-zero — keeps
  // the chart honest for newer pros (don't show 8 empty bars). Always
  // keep at least 4 weeks if we have them.
  let firstNonZero = trendPoints.findIndex((p) => p.grossCents > 0);
  if (firstNonZero === -1) firstNonZero = trendPoints.length;
  const keepFrom = Math.min(
    firstNonZero,
    trendPoints.length - MONEY_TREND_MIN_WEEKS,
  );
  const trimmedTrend = trendPoints.slice(Math.max(0, keepFrom));
  const trendHasEnoughData = trimmedTrend.length >= MONEY_TREND_MIN_WEEKS;

  // ── Profit per minute (90 days) ────────────────────────────────────
  const qualifying = last90Rows.filter(
    (r) => r.service_started_at && r.service_ended_at,
  );
  let totalRevenueCents = 0;
  let totalMinutes = 0;
  for (const r of qualifying) {
    const startMs = new Date(r.service_started_at!).getTime();
    const endMs = new Date(r.service_ended_at!).getTime();
    const minutes = Math.max(0, (endMs - startMs) / 60_000);
    if (minutes <= 0) continue;
    const svc = pickFirst(r.services);
    totalRevenueCents += svc?.price_cents ?? 0;
    totalMinutes += minutes;
  }
  const profitPerMinute: ProfitPerMinute = {
    hasEnoughData: qualifying.length >= PROFIT_PER_MINUTE_MIN_BOOKINGS && totalMinutes > 0,
    qualifyingBookings: qualifying.length,
    totalRevenueCents,
    totalMinutes,
    centsPerMinute: totalMinutes > 0 ? totalRevenueCents / totalMinutes : 0,
  };

  return {
    timeZone,
    windows,
    topServices,
    topServicesHasEnoughData,
    paymentMix,
    trend: { hasEnoughData: trendHasEnoughData, points: trimmedTrend },
    profitPerMinute,
  };
}
