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
import {
  classifyReferrer,
  classifiedReferrerLabel,
  type ClassifiedReferrer,
} from "@/lib/referrer-classifier";
import {
  surveyAttributionLabel,
  type SurveyCode,
} from "@/lib/survey-options";

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

/**
 * Phase 5 closer — Pass the Torch revenue subtotal for the Money tab.
 * Renders as a single bottom line on the Revenue Overview card,
 * conditional on bookingCount > 0. Last-90-day window only — Pass
 * the Torch accumulates slowly enough that week-level signal isn't
 * useful, and the spec deliberately avoids per-window breakdown to
 * keep the card compact.
 */
export type PassTheTorch90DayRevenue = {
  bookingCount: number;
  revenueCollectedCents: number;
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
  /** Phase 5 closer — last-90-day Pass the Torch subtotal. */
  passTheTorch90: PassTheTorch90DayRevenue;
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
  /** Phase 5 closer — Pass the Torch attribution (migration 046). */
  referrer_business_id: string | null;
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
      // Phase 5 closer — referrer_business_id added so the
      // RevenueOverviewCard can show the last-90-day Pass the Torch
      // revenue subtotal.
      "id, start_at, status, deposit_paid, paid_in_full_at, paid_amount_cents, service_started_at, service_ended_at, service_id, referrer_business_id, services(id, name, price_cents, deposit_cents)",
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

  // Phase 5 closer — Pass the Torch revenue over the last-90-day
  // window. Reuses the in-memory rows already filtered to last90 by
  // last90Rows above. Single bottom line on the Revenue Overview
  // card; conditional on bookingCount > 0.
  const ptLast90 = last90Rows.filter((r) => r.referrer_business_id);
  const passTheTorch90: PassTheTorch90DayRevenue = {
    bookingCount: ptLast90.length,
    revenueCollectedCents: aggregateMoney(toMoneyInputs(ptLast90))
      .revenueCollectedCents,
  };

  return {
    timeZone,
    windows,
    topServices,
    topServicesHasEnoughData,
    paymentMix,
    trend: { hasEnoughData: trendHasEnoughData, points: trimmedTrend },
    profitPerMinute,
    passTheTorch90,
  };
}

// ────────────────────────────────────────────────────────────────────
// Phase 4.3 — Time tab
// ────────────────────────────────────────────────────────────────────
//
// Five cards, one batched query, in-memory bucketing. Operational voice
// throughout — surfaces observations ("services run 12 min over") not
// judgments ("you're running late"). Pros draw their own conclusions.
//
// Phase 3 timing-data dependency:
//   - Schedule accuracy        : needs BOTH service_started_at AND
//                                service_ended_at on a booking to count
//                                that booking. Sample-size 5.
//   - By-service timing        : same — needs both pings, ≥3 timed
//                                bookings per service.
//   - Started-but-not-stopped  : needs ONLY service_started_at +
//                                status='completed' + NULL
//                                service_ended_at. The "single-tap"
//                                pattern, distinct from the
//                                "double-tap" data the other two cards
//                                require.
//   - Time-of-day / Day-of-week patterns : no Phase 3 dependency. Use
//                                start_at only.

const TIME_WINDOW_DAYS = 90;
const STUCK_WINDOW_DAYS = 30;
const SCHEDULE_ACCURACY_MIN_BOOKINGS = 5;
const BY_SERVICE_MIN_TIMED_BOOKINGS = 3;
const BY_SERVICE_DISPLAY_LIMIT = 5;
const PATTERNS_MIN_BOOKINGS = 10;
const STUCK_VISIBLE_LIMIT = 5;

export type ScheduleAccuracy = {
  hasEnoughData: boolean;
  qualifyingBookings: number;
  totalActualMinutes: number;
  totalScheduledMinutes: number;
  /** Average per-booking overrun (positive = over scheduled, negative = under). */
  avgOverrunMinutes: number;
  /** Same direction as avgOverrunMinutes; 0 when totalScheduledMinutes is 0. */
  overrunPercent: number;
};

export type ByServiceTimingRow = {
  serviceId: string;
  name: string;
  /** Total non-cancelled bookings for this service in window — drives sort order. */
  bookingCount: number;
  /** Subset with both Phase 3 pings populated. Must be ≥ BY_SERVICE_MIN_TIMED_BOOKINGS for the row to render. */
  timedBookingCount: number;
  avgScheduledMinutes: number;
  avgActualMinutes: number;
  avgOverrunMinutes: number;
};

export type ByServiceTimingResult = {
  hasEnoughData: boolean;
  rows: ByServiceTimingRow[];
};

export type TimeOfDayBucket = "morning" | "afternoon" | "evening";

export type TimeOfDayPatterns = {
  hasEnoughData: boolean;
  totalBookings: number;
  buckets: Array<{ bucket: TimeOfDayBucket; label: string; count: number }>;
};

export type DayOfWeekPatterns = {
  hasEnoughData: boolean;
  totalBookings: number;
  /** Mon..Sun (0..6) to match getWeekRange's todayWeekdayIndex. */
  days: Array<{ label: string; count: number }>;
};

/**
 * Hour-by-day booking histogram for the Phase 9 PR 6 heatmap.
 * 7×24 grid: rows are Mon..Sun (0..6, matching DayOfWeekPatterns'
 * todayWeekdayIndex convention), columns are local hour 0..23 in the
 * pro's timezone. Each cell is the booking count for that
 * (weekday, hour) cell across the same TIME_WINDOW_DAYS window the
 * 3-bucket timeOfDay aggregation uses.
 *
 * Shares the same loop pass as timeOfDay and dayOfWeek inside
 * computeTimeData — no extra query, no extra parse cost.
 */
export type HourByDayHistogram = {
  hasEnoughData: boolean;
  totalBookings: number;
  /** [day 0..6][hour 0..23] = count */
  grid: number[][];
  /** Max cell value across the grid — convenient for color-scaling. */
  maxCell: number;
};

export type StuckBookingRow = {
  id: string;
  serviceStartedAt: Date;
  startAt: Date;
  serviceName: string;
  clientName: string;
};

export type StartedNotStopped = {
  /** Up to STUCK_VISIBLE_LIMIT rows, most-recently-started first. */
  visible: StuckBookingRow[];
  /** Count of stuck bookings beyond what's visible. Informational only — no link target in v1. */
  moreCount: number;
  totalCount: number;
};

export type TimeData = {
  timeZone: string;
  scheduleAccuracy: ScheduleAccuracy;
  byService: ByServiceTimingResult;
  timeOfDay: TimeOfDayPatterns;
  dayOfWeek: DayOfWeekPatterns;
  /** Phase 9 PR 6 — 7×24 booking heatmap. Extension of the same
   *  loop that computes timeOfDay + dayOfWeek; no new query. */
  hourByDay: HourByDayHistogram;
  stuck: StartedNotStopped;
};

export async function getTimeData(
  businessId: string,
  timeZone: string,
): Promise<TimeData> {
  return unstable_cache(
    async () => computeTimeData(businessId, timeZone),
    ["business-brain-time", businessId, timeZone],
    { revalidate: 3600 },
  )();
}

type TimeRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  service_id: string | null;
  service_started_at: string | null;
  service_ended_at: string | null;
  services:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
  clients:
    | { name: string }
    | { name: string }[]
    | null;
};

async function computeTimeData(
  businessId: string,
  timeZone: string,
): Promise<TimeData> {
  const admin = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - TIME_WINDOW_DAYS * MS_DAY);
  const stuckStart = new Date(now.getTime() - STUCK_WINDOW_DAYS * MS_DAY);

  const { data } = await admin
    .from("bookings")
    .select(
      "id, start_at, end_at, status, service_id, service_started_at, service_ended_at, services(id, name), clients(name)",
    )
    .eq("business_id", businessId)
    .gte("start_at", windowStart.toISOString())
    .lt("start_at", now.toISOString());

  const allRows = ((data ?? []) as TimeRow[]).filter(
    (r) => r.status !== "cancelled",
  );

  // ── Schedule accuracy ──────────────────────────────────────────────
  // Note on duration source: "scheduled" = end_at - start_at, the
  // calendar block as it stood at booking time (or last reschedule).
  // Equivalent to services.duration_minutes for ~95% of bookings;
  // diverges only when (a) the pro edited services.duration_minutes
  // after the booking was made, or (b) the booking was rescheduled
  // (which re-derives end_at from the CURRENT catalog duration).
  // Acceptable trade-off for not joining services for duration math.
  type Timed = { actualMin: number; scheduledMin: number };
  const timed: Timed[] = [];
  for (const r of allRows) {
    if (!r.service_started_at || !r.service_ended_at) continue;
    const actualMin = Math.max(
      0,
      (new Date(r.service_ended_at).getTime() -
        new Date(r.service_started_at).getTime()) /
        60_000,
    );
    const scheduledMin = Math.max(
      0,
      (new Date(r.end_at).getTime() - new Date(r.start_at).getTime()) / 60_000,
    );
    if (scheduledMin === 0) continue;
    timed.push({ actualMin, scheduledMin });
  }

  let totalActualMinutes = 0;
  let totalScheduledMinutes = 0;
  for (const t of timed) {
    totalActualMinutes += t.actualMin;
    totalScheduledMinutes += t.scheduledMin;
  }
  const accuracyHasData = timed.length >= SCHEDULE_ACCURACY_MIN_BOOKINGS;
  const avgOverrunMinutes =
    timed.length > 0
      ? (totalActualMinutes - totalScheduledMinutes) / timed.length
      : 0;
  const overrunPercent =
    totalScheduledMinutes > 0
      ? (totalActualMinutes - totalScheduledMinutes) / totalScheduledMinutes
      : 0;

  const scheduleAccuracy: ScheduleAccuracy = {
    hasEnoughData: accuracyHasData,
    qualifyingBookings: timed.length,
    totalActualMinutes,
    totalScheduledMinutes,
    avgOverrunMinutes,
    overrunPercent,
  };

  // ── By-service timing ──────────────────────────────────────────────
  // Group all (non-cancelled) window bookings by service_id to get
  // bookingCount (sort key). Compute timed averages only over bookings
  // with both pings. Services below the timed-bookings threshold are
  // filtered out.
  type ServiceAgg = {
    name: string;
    bookingCount: number;
    timedBookingCount: number;
    actualSumMin: number;
    scheduledSumMin: number;
  };
  const byServiceMap = new Map<string, ServiceAgg>();
  for (const r of allRows) {
    if (!r.service_id) continue;
    const svc = pickFirst(r.services);
    if (!svc) continue;
    const cur =
      byServiceMap.get(r.service_id) ??
      {
        name: svc.name,
        bookingCount: 0,
        timedBookingCount: 0,
        actualSumMin: 0,
        scheduledSumMin: 0,
      };
    cur.bookingCount += 1;
    if (r.service_started_at && r.service_ended_at) {
      const actualMin = Math.max(
        0,
        (new Date(r.service_ended_at).getTime() -
          new Date(r.service_started_at).getTime()) /
          60_000,
      );
      const scheduledMin = Math.max(
        0,
        (new Date(r.end_at).getTime() - new Date(r.start_at).getTime()) /
          60_000,
      );
      if (scheduledMin > 0) {
        cur.timedBookingCount += 1;
        cur.actualSumMin += actualMin;
        cur.scheduledSumMin += scheduledMin;
      }
    }
    byServiceMap.set(r.service_id, cur);
  }
  const byServiceRows: ByServiceTimingRow[] = Array.from(byServiceMap.entries())
    .filter(([, v]) => v.timedBookingCount >= BY_SERVICE_MIN_TIMED_BOOKINGS)
    .map(([serviceId, v]) => {
      const avgActual = v.actualSumMin / v.timedBookingCount;
      const avgSched = v.scheduledSumMin / v.timedBookingCount;
      return {
        serviceId,
        name: v.name,
        bookingCount: v.bookingCount,
        timedBookingCount: v.timedBookingCount,
        avgActualMinutes: avgActual,
        avgScheduledMinutes: avgSched,
        avgOverrunMinutes: avgActual - avgSched,
      };
    })
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, BY_SERVICE_DISPLAY_LIMIT);

  // ── Time-of-day + Day-of-week patterns ─────────────────────────────
  // Three buckets in v1: morning < 12, afternoon 12–16, evening ≥ 17,
  // all in pro's local tz. Day-of-week uses the same Mon=0..Sun=6
  // convention as getWeekRange.
  const todBuckets: Record<TimeOfDayBucket, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
  };
  const dowCounts = new Array<number>(7).fill(0);
  const dowMap: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  });
  const weekdayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  // 7×24 grid for the Phase 9 PR 6 heatmap, populated in the same
  // pass. Mon=0..Sun=6 to match dowCounts.
  const hourByDayGrid: number[][] = Array.from({ length: 7 }, () =>
    new Array<number>(24).fill(0),
  );
  let hourByDayMax = 0;

  for (const r of allRows) {
    const d = new Date(r.start_at);
    const hour = Number.parseInt(hourFmt.format(d), 10) % 24;
    if (hour < 12) todBuckets.morning += 1;
    else if (hour < 17) todBuckets.afternoon += 1;
    else todBuckets.evening += 1;

    const idx = dowMap[weekdayFmt.format(d)];
    if (idx !== undefined) {
      dowCounts[idx] += 1;
      const cellNext = hourByDayGrid[idx][hour] + 1;
      hourByDayGrid[idx][hour] = cellNext;
      if (cellNext > hourByDayMax) hourByDayMax = cellNext;
    }
  }

  const totalForPatterns = allRows.length;
  const patternsHaveEnough = totalForPatterns >= PATTERNS_MIN_BOOKINGS;

  const timeOfDay: TimeOfDayPatterns = {
    hasEnoughData: patternsHaveEnough,
    totalBookings: totalForPatterns,
    buckets: [
      { bucket: "morning", label: "Morning", count: todBuckets.morning },
      { bucket: "afternoon", label: "Afternoon", count: todBuckets.afternoon },
      { bucket: "evening", label: "Evening", count: todBuckets.evening },
    ],
  };

  const dayOfWeek: DayOfWeekPatterns = {
    hasEnoughData: patternsHaveEnough,
    totalBookings: totalForPatterns,
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({
      label,
      count: dowCounts[i],
    })),
  };

  const hourByDay: HourByDayHistogram = {
    hasEnoughData: patternsHaveEnough,
    totalBookings: totalForPatterns,
    grid: hourByDayGrid,
    maxCell: hourByDayMax,
  };

  // ── Started-but-not-stopped (last 30 days) ─────────────────────────
  // Filter: status='completed' AND service_started_at NOT NULL AND
  // service_ended_at NULL. Most-recently-started first.
  const stuckCandidates = allRows
    .filter((r) => {
      if (r.status !== "completed") return false;
      if (!r.service_started_at) return false;
      if (r.service_ended_at) return false;
      return new Date(r.service_started_at).getTime() >= stuckStart.getTime();
    })
    .map((r) => {
      const svc = pickFirst(r.services);
      const cli = pickFirst(r.clients);
      return {
        id: r.id,
        serviceStartedAt: new Date(r.service_started_at!),
        startAt: new Date(r.start_at),
        serviceName: svc?.name ?? "Service",
        clientName: cli?.name ?? "Client",
      };
    })
    .sort(
      (a, b) =>
        b.serviceStartedAt.getTime() - a.serviceStartedAt.getTime(),
    );

  const stuck: StartedNotStopped = {
    visible: stuckCandidates.slice(0, STUCK_VISIBLE_LIMIT),
    moreCount: Math.max(0, stuckCandidates.length - STUCK_VISIBLE_LIMIT),
    totalCount: stuckCandidates.length,
  };

  return {
    timeZone,
    scheduleAccuracy,
    byService: {
      hasEnoughData: byServiceRows.length > 0,
      rows: byServiceRows,
    },
    timeOfDay,
    dayOfWeek,
    hourByDay,
    stuck,
  };
}

// ────────────────────────────────────────────────────────────────────
// Phase 4.4 — Clients tab
// ────────────────────────────────────────────────────────────────────
//
// Five cards. One all-time fetch (with services + clients joins) feeds
// every computation via in-memory bucketing. Cancelled bookings excluded
// across the board (status NOT IN ('cancelled')).
//
// Privacy framing: cards display client NAMES only. Email/phone live
// on /dashboard/clients (the operational client surface). Business
// Brain Clients is read-only analytics; the Drifting Clients card
// includes a footer link to /dashboard/clients so pros can pivot to
// contact details when they want to act.
//
// LTV reuses aggregateMoney for consistency with Phase 4.2's
// "revenue collected through OYRB" framing. Pros without Stripe
// Connect see $0 collected revenue across all clients — that's
// honest. The Top Clients card auto-falls-back to ranking by booking
// volume in that case (rankedByBookingVolume=true).

const CLIENTS_OVERVIEW_WINDOW_DAYS = 90;
const CLIENTS_OVERVIEW_MIN_UNIQUE = 10;
const TOP_CLIENTS_MIN_QUALIFYING = 5;
const TOP_CLIENTS_MIN_BOOKINGS_EACH = 2;
const TOP_CLIENTS_DISPLAY_LIMIT = 5;
const DRIFTING_MIN_BOOKINGS = 3;
const DRIFTING_GAP_LOWER_DAYS = 60;
const DRIFTING_GAP_UPPER_DAYS = 180;
const DRIFTING_DISPLAY_LIMIT = 5;
const NEW_CLIENTS_TREND_MONTHS = 6;
const RETENTION_COHORT_MIN = 10;
const RETENTION_COHORT_OLDER_DAYS = 180;
const RETENTION_COHORT_NEWER_DAYS = 90;

export type RepeatClientOverview = {
  hasEnoughData: boolean;
  uniqueClientsLast90: number;
  repeatClientsLast90: number;
  /** repeatClientsLast90 / uniqueClientsLast90, in [0, 1]. */
  repeatRate: number;
  totalBookingsLast90: number;
  /** totalBookingsLast90 / uniqueClientsLast90. */
  avgBookingsPerClient: number;
};

export type TopClientByLTV = {
  clientId: string;
  name: string;
  bookingCount: number;
  /** Via aggregateMoney — revenue actually captured by OYRB. */
  revenueCollectedCents: number;
  lastBookingAt: Date;
};

export type TopClientsLTVResult = {
  /** True when ≥ TOP_CLIENTS_MIN_QUALIFYING clients have ≥ TOP_CLIENTS_MIN_BOOKINGS_EACH bookings. */
  hasEnoughData: boolean;
  rows: TopClientByLTV[];
  /**
   * True when none of the top-5 candidates have positive
   * revenueCollectedCents — typically a pro who collects payments
   * outside OYRB. The card switches to ranking-by-booking-volume
   * with an explainer footer.
   */
  rankedByBookingVolume: boolean;
};

export type DriftingClient = {
  clientId: string;
  name: string;
  historicalBookingCount: number;
  historicalRevenueCents: number;
  lastBookingAt: Date;
  daysSinceLastBooking: number;
};

export type DriftingClients = {
  /** Top by historicalRevenueCents desc, capped at DRIFTING_DISPLAY_LIMIT. */
  rows: DriftingClient[];
  /** Total drifting clients matching the rule (visible + beyond). */
  totalCount: number;
};

export type NewClientsMonthBucket = {
  /** YYYY-MM key in pro tz, used internally. */
  monthKey: string;
  /** Display label e.g. "May" for current year, "Apr 2025" for prior year. */
  label: string;
  count: number;
};

export type NewClientsTrend = {
  /** True when at least one bucket has ≥1 new client. */
  hasEnoughData: boolean;
  /** Exactly NEW_CLIENTS_TREND_MONTHS buckets, oldest first. */
  buckets: NewClientsMonthBucket[];
  totalNew: number;
};

export type ClientRetention = {
  /** True when ≥ RETENTION_COHORT_MIN clients in the cohort window. */
  hasEnoughData: boolean;
  cohortSize: number;
  retainedCount: number;
  /** retainedCount / cohortSize, in [0, 1]. */
  retentionRate: number;
};

export type ClientsData = {
  timeZone: string;
  repeatOverview: RepeatClientOverview;
  topByLTV: TopClientsLTVResult;
  drifting: DriftingClients;
  newClientsTrend: NewClientsTrend;
  retention: ClientRetention;
};

export async function getClientsData(
  businessId: string,
  timeZone: string,
): Promise<ClientsData> {
  return unstable_cache(
    async () => computeClientsData(businessId, timeZone),
    ["business-brain-clients", businessId, timeZone],
    { revalidate: 3600 },
  )();
}

type ClientRow = {
  id: string;
  start_at: string;
  status: string;
  client_id: string | null;
  deposit_paid: boolean | null;
  paid_in_full_at: string | null;
  paid_amount_cents: number | null;
  services:
    | { price_cents: number; deposit_cents: number }
    | { price_cents: number; deposit_cents: number }[]
    | null;
  clients:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

async function computeClientsData(
  businessId: string,
  timeZone: string,
): Promise<ClientsData> {
  const admin = createAdminClient();
  const now = new Date();

  // All-time fetch. LTV requires it; the 90-day-window cards filter
  // in-memory off the same array. At OYRB scale this is small and
  // cheap — a pro with 5 years of bookings is still in the low
  // thousands of rows.
  const { data } = await admin
    .from("bookings")
    .select(
      "id, start_at, status, client_id, deposit_paid, paid_in_full_at, paid_amount_cents, services(price_cents, deposit_cents), clients(id, name)",
    )
    .eq("business_id", businessId)
    .neq("status", "cancelled")
    // Defensive cap. Even an outlier pro with 5+ years of high volume
    // shouldn't exceed this; if they do, we'd notice and revisit.
    .order("start_at", { ascending: false })
    .limit(20000);

  const allRows = ((data ?? []) as ClientRow[]).filter((r) => !!r.client_id);

  // Group all-time bookings by client_id. Used by every card except
  // new-clients-trend (which uses first-booking) and retention
  // (which uses cohort math).
  type PerClient = {
    clientId: string;
    name: string;
    bookings: ClientRow[];
    firstBookingAt: Date;
    lastBookingAt: Date;
    bookingCount: number;
  };
  const byClient = new Map<string, PerClient>();
  for (const r of allRows) {
    const cid = r.client_id!;
    const cliJoin = pickFirst(r.clients);
    const startAt = new Date(r.start_at);
    const cur =
      byClient.get(cid) ??
      ({
        clientId: cid,
        name: cliJoin?.name ?? "Client",
        bookings: [] as ClientRow[],
        firstBookingAt: startAt,
        lastBookingAt: startAt,
        bookingCount: 0,
      } as PerClient);
    cur.bookings.push(r);
    cur.bookingCount += 1;
    if (startAt < cur.firstBookingAt) cur.firstBookingAt = startAt;
    if (startAt > cur.lastBookingAt) cur.lastBookingAt = startAt;
    byClient.set(cid, cur);
  }

  // ── Repeat client overview (last 90 days) ──────────────────────────
  const overviewStart = new Date(
    now.getTime() - CLIENTS_OVERVIEW_WINDOW_DAYS * MS_DAY,
  );
  const overviewClients = new Set<string>();
  const overviewBookingsByClient = new Map<string, number>();
  let totalBookingsLast90 = 0;
  for (const r of allRows) {
    if (new Date(r.start_at).getTime() < overviewStart.getTime()) continue;
    overviewClients.add(r.client_id!);
    overviewBookingsByClient.set(
      r.client_id!,
      (overviewBookingsByClient.get(r.client_id!) ?? 0) + 1,
    );
    totalBookingsLast90 += 1;
  }
  const uniqueClientsLast90 = overviewClients.size;
  const repeatClientsLast90 = Array.from(
    overviewBookingsByClient.values(),
  ).filter((n) => n >= 2).length;
  const repeatOverview: RepeatClientOverview = {
    hasEnoughData: uniqueClientsLast90 >= CLIENTS_OVERVIEW_MIN_UNIQUE,
    uniqueClientsLast90,
    repeatClientsLast90,
    repeatRate:
      uniqueClientsLast90 > 0 ? repeatClientsLast90 / uniqueClientsLast90 : 0,
    totalBookingsLast90,
    avgBookingsPerClient:
      uniqueClientsLast90 > 0 ? totalBookingsLast90 / uniqueClientsLast90 : 0,
  };

  // ── Top clients by LTV (all-time) ──────────────────────────────────
  // Compute revenueCollectedCents per client via aggregateMoney for
  // consistency with Phase 4.2. Filter to clients with ≥
  // TOP_CLIENTS_MIN_BOOKINGS_EACH bookings before sorting.
  const eligibleForLTV = Array.from(byClient.values()).filter(
    (c) => c.bookingCount >= TOP_CLIENTS_MIN_BOOKINGS_EACH,
  );
  const ltvCandidates = eligibleForLTV.map((c) => {
    const moneyInputs: MoneyInput[] = c.bookings.map((b) => {
      const svc = pickFirst(b.services);
      return {
        depositPaid: !!b.deposit_paid,
        paidInFullAt: b.paid_in_full_at,
        paidAmountCents: b.paid_amount_cents ?? 0,
        priceCents: svc?.price_cents ?? 0,
        depositCents: svc?.deposit_cents ?? 0,
      };
    });
    const m = aggregateMoney(moneyInputs);
    return {
      clientId: c.clientId,
      name: c.name,
      bookingCount: c.bookingCount,
      revenueCollectedCents: m.revenueCollectedCents,
      lastBookingAt: c.lastBookingAt,
    } as TopClientByLTV;
  });

  const sortedByRevenue = [...ltvCandidates].sort(
    (a, b) => b.revenueCollectedCents - a.revenueCollectedCents,
  );
  const topRevenueSlice = sortedByRevenue.slice(0, TOP_CLIENTS_DISPLAY_LIMIT);
  const allZero = topRevenueSlice.every((r) => r.revenueCollectedCents === 0);
  const topByLTV: TopClientsLTVResult = {
    hasEnoughData: ltvCandidates.length >= TOP_CLIENTS_MIN_QUALIFYING,
    rows: allZero
      ? [...ltvCandidates]
          .sort((a, b) => b.bookingCount - a.bookingCount)
          .slice(0, TOP_CLIENTS_DISPLAY_LIMIT)
      : topRevenueSlice,
    rankedByBookingVolume: allZero,
  };

  // ── Drifting clients (60-180 day gap) ──────────────────────────────
  // 3+ historical bookings AND last booking 60-180 days ago. Sorted
  // by historicalRevenueCents desc. "Completed" in the spec text is
  // interpreted as "non-cancelled past bookings" — at 60+ days out,
  // the auto-complete cron has long since flipped them to status=
  // 'completed', so the practical result is the same.
  const driftingLowerMs = now.getTime() - DRIFTING_GAP_LOWER_DAYS * MS_DAY;
  const driftingUpperMs = now.getTime() - DRIFTING_GAP_UPPER_DAYS * MS_DAY;
  const driftingCandidates: DriftingClient[] = [];
  for (const c of byClient.values()) {
    if (c.bookingCount < DRIFTING_MIN_BOOKINGS) continue;
    const lastMs = c.lastBookingAt.getTime();
    if (lastMs > driftingLowerMs || lastMs < driftingUpperMs) continue;
    const moneyInputs: MoneyInput[] = c.bookings.map((b) => {
      const svc = pickFirst(b.services);
      return {
        depositPaid: !!b.deposit_paid,
        paidInFullAt: b.paid_in_full_at,
        paidAmountCents: b.paid_amount_cents ?? 0,
        priceCents: svc?.price_cents ?? 0,
        depositCents: svc?.deposit_cents ?? 0,
      };
    });
    const m = aggregateMoney(moneyInputs);
    driftingCandidates.push({
      clientId: c.clientId,
      name: c.name,
      historicalBookingCount: c.bookingCount,
      historicalRevenueCents: m.revenueCollectedCents,
      lastBookingAt: c.lastBookingAt,
      daysSinceLastBooking: Math.floor(
        (now.getTime() - lastMs) / MS_DAY,
      ),
    });
  }
  driftingCandidates.sort(
    (a, b) => b.historicalRevenueCents - a.historicalRevenueCents,
  );
  const drifting: DriftingClients = {
    rows: driftingCandidates.slice(0, DRIFTING_DISPLAY_LIMIT),
    totalCount: driftingCandidates.length,
  };

  // ── New clients trend (6 months, monthly buckets in pro tz) ────────
  // First-booking date = min(start_at) per client_id. We deliberately
  // do NOT use clients.created_at, because pros can pre-create client
  // records via manual booking entry (PR #14) without a booking
  // immediately following. min(start_at) is the truthful "first
  // booking happened" timestamp.
  const monthFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
  });
  const monthKeyFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  });

  // Build the 6 month buckets in chronological order. Use the 1st of
  // each month at noon-UTC as the probe instant for label formatting
  // (DST-stable).
  const monthBuckets: NewClientsMonthBucket[] = [];
  const monthStartMsList: Array<{ key: string; startMs: number; endMs: number }> = [];
  const nowParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const thisMonthYear = Number(nowParts.year);
  const thisMonthIdx = Number(nowParts.month) - 1; // 0-11
  const thisYear = new Date().getUTCFullYear();
  for (let i = NEW_CLIENTS_TREND_MONTHS - 1; i >= 0; i -= 1) {
    const targetMonthIdx = thisMonthIdx - i;
    const targetYear =
      thisMonthYear + Math.floor(targetMonthIdx / 12);
    const normalizedIdx = ((targetMonthIdx % 12) + 12) % 12;
    const probe = new Date(Date.UTC(targetYear, normalizedIdx, 1, 12));
    const key = monthKeyFmt.format(probe); // "YYYY-MM"
    const labelMonth = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
    }).format(probe);
    const includeYear = targetYear !== thisYear;
    const label = includeYear ? `${labelMonth} ${targetYear}` : labelMonth;
    monthBuckets.push({ monthKey: key, label, count: 0 });
    // Bucket boundaries in ISO for filtering.
    const offsetMin = getTzOffsetMinutes(probe, timeZone);
    const startMs =
      Date.UTC(targetYear, normalizedIdx, 1, 0) - offsetMin * 60_000;
    const nextMonthIdx = normalizedIdx + 1;
    const nextMonthYear =
      nextMonthIdx >= 12 ? targetYear + 1 : targetYear;
    const endMs =
      Date.UTC(nextMonthYear, nextMonthIdx % 12, 1, 0) - offsetMin * 60_000;
    monthStartMsList.push({ key, startMs, endMs });
  }

  // For each client, find their first-booking month and increment the
  // matching bucket if it falls in the 6-month window.
  let totalNew = 0;
  for (const c of byClient.values()) {
    const firstMs = c.firstBookingAt.getTime();
    for (const m of monthStartMsList) {
      if (firstMs >= m.startMs && firstMs < m.endMs) {
        const bucket = monthBuckets.find((b) => b.monthKey === m.key);
        if (bucket) {
          bucket.count += 1;
          totalNew += 1;
        }
        break;
      }
    }
  }
  const newClientsTrend: NewClientsTrend = {
    hasEnoughData: totalNew > 0,
    buckets: monthBuckets,
    totalNew,
  };

  // ── Client retention (cohort: first booking 180-90 days ago) ───────
  // Cohort window is 90 days wide, ending 90 days ago. Then "retained"
  // = booked at all in the last 90 days. True cohort math; smaller
  // numbers but meaningful signal.
  const cohortNewerMs = now.getTime() - RETENTION_COHORT_NEWER_DAYS * MS_DAY;
  const cohortOlderMs = now.getTime() - RETENTION_COHORT_OLDER_DAYS * MS_DAY;
  const recentMs = cohortNewerMs;
  let cohortSize = 0;
  let retainedCount = 0;
  for (const c of byClient.values()) {
    const firstMs = c.firstBookingAt.getTime();
    if (firstMs > cohortNewerMs || firstMs < cohortOlderMs) continue;
    cohortSize += 1;
    // Retained = at least one booking in the last 90 days.
    const hasRecent = c.bookings.some(
      (b) => new Date(b.start_at).getTime() >= recentMs,
    );
    if (hasRecent) retainedCount += 1;
  }
  const retention: ClientRetention = {
    hasEnoughData: cohortSize >= RETENTION_COHORT_MIN,
    cohortSize,
    retainedCount,
    retentionRate: cohortSize > 0 ? retainedCount / cohortSize : 0,
  };

  return {
    timeZone,
    repeatOverview,
    topByLTV,
    drifting,
    newClientsTrend,
    retention,
  };
}

// ────────────────────────────────────────────────────────────────────
// Phase 4.5 — Where They Come From tab
// ────────────────────────────────────────────────────────────────────
//
// Honest scoping: 3 cards in v1 because that's what the data supports
// today. Future Phase 5 work adds richer attribution (UTM parsing,
// Pass the Torch persistence per booking, "How did you hear about us?"
// survey field, storefront view tracking). Until then:
//
//   - Acquisition mix       — new vs returning client bookings,
//                             90-day window. Always renderable from
//                             min(start_at) per client_id.
//   - Booking origin        — public widget vs manual, via the new
//                             bookings.booking_source column
//                             (migration 044). Hidden when 100% of
//                             bookings are manual entry — there's no
//                             distribution to show.
//   - "What we don't track" — explainer card. Sets expectations
//                             honestly + gives pros a workaround
//                             (use the booking notes field).
//
// Source attribution priority (v1, narrow): just booking_source +
// new-vs-returning derivation. When Phase 5 lands richer fields,
// the priority becomes:
//     survey_response > utm_source > pass_the_torch > booking_source > Unknown
// Code documents this so future readers know where to extend.

const REFERRAL_WINDOW_DAYS = 90;
const REFERRAL_MIN_BOOKINGS = 10;

export type AcquisitionMix = {
  hasEnoughData: boolean;
  totalBookings: number;
  newClientBookings: number;
  returningClientBookings: number;
  newClientPct: number;       // 0..1
  returningClientPct: number; // 0..1
};

export type BookingOriginBreakdown = {
  /** True when ≥ REFERRAL_MIN_BOOKINGS in the window. */
  hasEnoughData: boolean;
  /** Hidden when public_widget count is zero — there's no distribution to show. */
  showCard: boolean;
  totalBookings: number;
  publicWidgetCount: number;
  manualCount: number;
  unknownCount: number;
  publicWidgetPct: number;
  manualPct: number;
  unknownPct: number;
};

/**
 * Phase 5 — top sources for the Where They Come From tab.
 *
 * Source attribution priority (applied per booking by attributeSource):
 *   1. utm_source if not null      — highest specificity
 *   2. classified referrer hostname — broad bucket from hostname matching
 *   3. "Direct" — booking_source = 'public_widget' AND no UTM/referrer
 *   4. "Unknown" — legacy bookings (pre-Phase 5) or manual bookings
 */
export type SourceBreakdown = {
  /** Display label, e.g. "Instagram", "Direct", "Unknown", or a sanitized utm_source value. */
  source: string;
  bookingCount: number;
  /** bookingCount / total — for the bar widths. */
  pct: number;
};

export type TopSourcesResult = {
  /** True when ≥10 bookings in 90 days. */
  hasEnoughData: boolean;
  totalBookings: number;
  /** Sorted by bookingCount desc. */
  sources: SourceBreakdown[];
};

export type SourceRevenueRow = {
  source: string;
  bookingCount: number;
  revenueCollectedCents: number;
};

export type SourceRevenueResult = {
  /** True when ≥10 bookings AND at least one source crossed >$0 collected. */
  hasEnoughData: boolean;
  rows: SourceRevenueRow[];
};

export type UtmCampaignRow = {
  utmCampaign: string;
  /** Most-common utm_source paired with this campaign in the window (display only). */
  utmSource: string | null;
  bookingCount: number;
};

export type UtmCampaignsResult = {
  /** True when ≥5 UTM-tagged bookings in 90 days. */
  hasEnoughData: boolean;
  totalUtmTaggedBookings: number;
  /** Top 5 by booking count desc. */
  rows: UtmCampaignRow[];
};

export type PassTheTorchTopReferrer = {
  referrerBusinessId: string;
  /** Joined business_name; "Former pro" when the referring row has been deleted (FK ON DELETE SET NULL leaves bookingCount but the join returns null). */
  name: string;
  bookingCount: number;
};

export type PassTheTorchData = {
  /** True when ≥1 Pass the Torch booking in the 90-day window. Lowest sample-size guard of any card — surface as soon as it exists. */
  hasAny: boolean;
  bookingCount: number;
  uniqueReferringPros: number;
  /** Via aggregateMoney — revenue actually captured by OYRB on Pass the Torch bookings. */
  revenueCollectedCents: number;
  /** Top 3 by booking count desc. */
  topReferrers: PassTheTorchTopReferrer[];
};

export type ReferralData = {
  timeZone: string;
  acquisition: AcquisitionMix;
  origin: BookingOriginBreakdown;
  /** Phase 5 — classified-source breakdown over the 90-day window. */
  topSources: TopSourcesResult;
  /** Phase 5 — same source breakdown, ranked by revenue contribution. */
  sourceRevenue: SourceRevenueResult;
  /** Phase 5 — explicit UTM campaign breakdown (when present). */
  utmCampaigns: UtmCampaignsResult;
  /** Phase 5 closer — Pass the Torch attribution (migration 046). */
  passTheTorch: PassTheTorchData;
};

export async function getReferralData(
  businessId: string,
  timeZone: string,
): Promise<ReferralData> {
  return unstable_cache(
    async () => computeReferralData(businessId, timeZone),
    ["business-brain-referral", businessId, timeZone],
    { revalidate: 3600 },
  )();
}

type ReferralRow = {
  id: string;
  start_at: string;
  client_id: string | null;
  status: string;
  booking_source: string | null;
  // Phase 5 — referral signals (migration 045).
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_url: string | null;
  // Phase 5 — Pass the Torch attribution (migration 046).
  referrer_business_id: string | null;
  /**
   * Joined referring business name when referrer_business_id is set.
   * Aliased via the Supabase `referring_business:businesses!referrer_business_id(...)`
   * select syntax. NULL when no referrer or when the referring business
   * was deleted (FK ON DELETE SET NULL kicks in).
   */
  referring_business:
    | { business_name: string }
    | { business_name: string }[]
    | null;
  /** Phase 5 closer — "How did you hear about us?" survey (migration 048). */
  survey_response: string | null;
  // For source-revenue aggregation.
  deposit_paid: boolean | null;
  paid_in_full_at: string | null;
  paid_amount_cents: number | null;
  services:
    | { price_cents: number; deposit_cents: number }
    | { price_cents: number; deposit_cents: number }[]
    | null;
};

/**
 * Canonical source attribution — 6-tier priority chain. Used by the
 * source-attribution analytics cards (TopSourcesCard, SourceRevenueCard,
 * PassTheTorchCard's underlying aggregation, UtmCampaignsCard's source
 * pairing). Highest-quality signal wins.
 *
 *   1. Survey response (survey_response IS NOT NULL, excluding
 *      'prefer_not_to_say' which is silent) — Phase 5 closer.
 *      Self-reported by the client; the most reliable acquisition
 *      signal because the client themselves told us. Returns labels
 *      like "Instagram (self-reported)" so signal quality stays
 *      visible on the card.
 *   2. Pass the Torch (referrer_business_id IS NOT NULL) — platform-
 *      internal referral, persisted at insert time.
 *   3. utm_source if not null — explicit URL tagging by the pro.
 *   4. classified referrer from referrer_url — hostname-suffix bucket.
 *   5. "Direct" — public widget booking with no UTM/referrer.
 *   6. "Unknown" — legacy or manual bookings.
 *
 * NOTE — DIVERGENT HELPER FOR CONVERSION ANALYTICS:
 * ConversionBySourceCard (PR #37) uses attributeSourceForConversion()
 * below, which skips priority 1 (survey). Reason: storefront views
 * don't carry survey responses (the survey only appears at booking
 * time), so a survey-attributed booking like "Instagram (self-reported)"
 * couldn't be matched to a view-side bucket of the same name —
 * conversion math would produce nonsense ("0 views, 3 bookings, ∞%").
 * The 5-tier conversion helper buckets bookings and views consistently.
 *
 * Two helpers, two purposes — intentionally different. Both are honest;
 * conflating them would not be.
 */
function attributeSource(row: {
  utm_source: string | null;
  referrer_url: string | null;
  booking_source: string | null;
  referrer_business_id: string | null;
  /** Phase 5 closer — lowercase enum from src/lib/survey-options.ts. */
  survey_response: string | null;
}): string {
  // Priority 1 — Phase 5 closer survey response (self-reported).
  // surveyAttributionLabel returns NULL for 'prefer_not_to_say' so
  // that response falls through to the next priority — clients who
  // declined to share signal aren't bucketed as if they answered.
  if (row.survey_response) {
    const label = surveyAttributionLabel(row.survey_response as SurveyCode);
    if (label) return label;
  }
  // Priority 2 — Pass the Torch attribution (PR #36).
  if (row.referrer_business_id) return "Pass the Torch";
  if (row.utm_source) {
    // Map common UTM source values to the same labels used by
    // classifyReferrer so "instagram" via UTM and "instagram" via
    // referrer_url bucket together. Unknown values fall through to
    // a Title-Cased version of the raw value.
    const lower = row.utm_source.toLowerCase();
    const known: Record<string, ClassifiedReferrer> = {
      instagram: "instagram",
      ig: "instagram",
      tiktok: "tiktok",
      google: "google",
      facebook: "facebook",
      fb: "facebook",
      twitter: "twitter",
      x: "twitter",
      youtube: "youtube",
      yt: "youtube",
      linktree: "linktree",
      pinterest: "pinterest",
    };
    if (known[lower]) return classifiedReferrerLabel(known[lower]);
    // Unrecognized UTM source — preserve the raw label, capitalized.
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  if (row.referrer_url) {
    return classifiedReferrerLabel(classifyReferrer(row.referrer_url));
  }
  if (row.booking_source === "public_widget") return "Direct";
  return "Unknown";
}

/**
 * Conversion-analytics attribution — 5-tier priority chain that
 * SKIPS the survey signal. Intentionally divergent from the
 * canonical attributeSource() above. See the long-form note in
 * attributeSource()'s docblock for the full rationale.
 *
 * Short version: storefront views don't carry survey responses.
 * If we used the canonical 6-tier chain for ConversionBySourceCard,
 * a booking attributed to "Instagram (self-reported)" couldn't be
 * matched to any view-side bucket — math goes nonsense ("0 views,
 * 3 bookings, ∞%"). This helper buckets bookings and views
 * consistently for funnel calculations: both sides skip survey,
 * both sides land in the same Pass-the-Torch / UTM / classified /
 * Direct / Unknown bucket.
 *
 * Survey-attributed bookings still appear correctly on
 * TopSourcesCard / SourceRevenueCard (which use the 6-tier chain);
 * they're just bucketed by their non-survey signal for conversion
 * math.
 */
function attributeSourceForConversion(row: {
  utm_source: string | null;
  referrer_url: string | null;
  booking_source: string | null;
  referrer_business_id: string | null;
}): string {
  // Same 5-tier chain as attributeSource minus priority 1 (survey).
  // Inlined rather than calling attributeSource with survey_response:
  // null because the type signatures differ — explicit divergence is
  // easier to reason about than a parameter trick.
  if (row.referrer_business_id) return "Pass the Torch";
  if (row.utm_source) {
    const lower = row.utm_source.toLowerCase();
    const known: Record<string, ClassifiedReferrer> = {
      instagram: "instagram",
      ig: "instagram",
      tiktok: "tiktok",
      google: "google",
      facebook: "facebook",
      fb: "facebook",
      twitter: "twitter",
      x: "twitter",
      youtube: "youtube",
      yt: "youtube",
      linktree: "linktree",
      pinterest: "pinterest",
    };
    if (known[lower]) return classifiedReferrerLabel(known[lower]);
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  if (row.referrer_url) {
    return classifiedReferrerLabel(classifyReferrer(row.referrer_url));
  }
  if (row.booking_source === "public_widget") return "Direct";
  return "Unknown";
}

async function computeReferralData(
  businessId: string,
  timeZone: string,
): Promise<ReferralData> {
  const admin = createAdminClient();
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - REFERRAL_WINDOW_DAYS * MS_DAY,
  );

  // Two queries:
  //   1. All-time bookings to derive each client's first-booking date
  //      (for new vs returning classification within the 90-day window).
  //      Pulls only the columns we need; cheap.
  //   2. Last-90-day bookings for the actual window aggregation.
  // Could be one query — splitting keeps each path's intent explicit.
  const [allRowsRes, windowRowsRes] = await Promise.all([
    admin
      .from("bookings")
      .select("client_id, start_at")
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .not("client_id", "is", null)
      .order("start_at", { ascending: true })
      .limit(20000),
    admin
      .from("bookings")
      .select(
        // Phase 5 — pull referral signals + services for revenue math.
        // referring_business join (migration 046) gives the referring
        // pro's display name for the Pass the Torch card's "top
        // referring pros" list. NULL when referrer_business_id is null
        // or the referring business was deleted (FK ON DELETE SET
        // NULL fires). survey_response (migration 048) drives priority
        // 1 of the canonical 6-tier source attribution chain.
        "id, start_at, client_id, status, booking_source, utm_source, utm_medium, utm_campaign, referrer_url, referrer_business_id, referring_business:businesses!referrer_business_id(business_name), survey_response, deposit_paid, paid_in_full_at, paid_amount_cents, services(price_cents, deposit_cents)",
      )
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .gte("start_at", windowStart.toISOString())
      .lt("start_at", now.toISOString()),
  ]);

  // First-booking-date per client (all-time).
  const firstBookingByClient = new Map<string, number>();
  for (const r of (allRowsRes.data ?? []) as Array<{
    client_id: string;
    start_at: string;
  }>) {
    const t = new Date(r.start_at).getTime();
    const cur = firstBookingByClient.get(r.client_id);
    if (cur === undefined || t < cur) {
      firstBookingByClient.set(r.client_id, t);
    }
  }

  const windowRows = (windowRowsRes.data ?? []) as ReferralRow[];

  // ── Acquisition mix ────────────────────────────────────────────────
  // A booking is "new client" if its start_at IS the client's first
  // booking. Otherwise the client was already in the book before this
  // appointment — "returning."
  let newClientBookings = 0;
  let returningClientBookings = 0;
  for (const r of windowRows) {
    if (!r.client_id) continue;
    const firstMs = firstBookingByClient.get(r.client_id);
    if (firstMs === undefined) continue;
    const t = new Date(r.start_at).getTime();
    if (t === firstMs) newClientBookings += 1;
    else returningClientBookings += 1;
  }
  const totalForAcquisition = newClientBookings + returningClientBookings;
  const acquisition: AcquisitionMix = {
    hasEnoughData: totalForAcquisition >= REFERRAL_MIN_BOOKINGS,
    totalBookings: totalForAcquisition,
    newClientBookings,
    returningClientBookings,
    newClientPct:
      totalForAcquisition > 0 ? newClientBookings / totalForAcquisition : 0,
    returningClientPct:
      totalForAcquisition > 0 ? returningClientBookings / totalForAcquisition : 0,
  };

  // ── Booking origin (public widget vs manual vs unknown) ────────────
  let publicWidgetCount = 0;
  let manualCount = 0;
  let unknownCount = 0;
  for (const r of windowRows) {
    if (r.booking_source === "public_widget") publicWidgetCount += 1;
    else if (r.booking_source === "manual") manualCount += 1;
    else unknownCount += 1;
  }
  const totalForOrigin = windowRows.length;
  const origin: BookingOriginBreakdown = {
    hasEnoughData: totalForOrigin >= REFERRAL_MIN_BOOKINGS,
    // Hide the card when no public widget bookings exist — the
    // distribution would just be "100% manual" which can read as
    // implicit guilt about the storefront not getting bookings.
    // Empty state in the UI explains the absence.
    showCard: publicWidgetCount > 0,
    totalBookings: totalForOrigin,
    publicWidgetCount,
    manualCount,
    unknownCount,
    publicWidgetPct: totalForOrigin > 0 ? publicWidgetCount / totalForOrigin : 0,
    manualPct: totalForOrigin > 0 ? manualCount / totalForOrigin : 0,
    unknownPct: totalForOrigin > 0 ? unknownCount / totalForOrigin : 0,
  };

  // ── Phase 5 aggregations (top sources / revenue / UTM campaigns) ──
  // All driven by the same windowRows already in memory. attributeSource
  // applies the priority: utm_source > classified referrer > Direct >
  // Unknown. Source-revenue uses aggregateMoney for consistency with
  // Phase 4.2's revenue-collected-through-OYRB framing.

  // Top sources — counts per attributed source.
  const sourceCounts = new Map<string, number>();
  for (const r of windowRows) {
    const src = attributeSource(r);
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }
  const totalSourceBookings = windowRows.length;
  const topSourcesSorted: SourceBreakdown[] = Array.from(sourceCounts.entries())
    .map(([source, bookingCount]) => ({
      source,
      bookingCount,
      pct: totalSourceBookings > 0 ? bookingCount / totalSourceBookings : 0,
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount);
  const topSources: TopSourcesResult = {
    hasEnoughData: totalSourceBookings >= REFERRAL_MIN_BOOKINGS,
    totalBookings: totalSourceBookings,
    sources: topSourcesSorted,
  };

  // Source × revenue — collected revenue per source via aggregateMoney.
  const sourceRevenueMap = new Map<
    string,
    { count: number; inputs: MoneyInput[] }
  >();
  for (const r of windowRows) {
    const src = attributeSource(r);
    const svc = pickFirst(r.services);
    const cur = sourceRevenueMap.get(src) ?? { count: 0, inputs: [] };
    cur.count += 1;
    cur.inputs.push({
      depositPaid: !!r.deposit_paid,
      paidInFullAt: r.paid_in_full_at,
      paidAmountCents: r.paid_amount_cents ?? 0,
      priceCents: svc?.price_cents ?? 0,
      depositCents: svc?.deposit_cents ?? 0,
    });
    sourceRevenueMap.set(src, cur);
  }
  const sourceRevenueRows: SourceRevenueRow[] = Array.from(
    sourceRevenueMap.entries(),
  )
    .map(([source, v]) => ({
      source,
      bookingCount: v.count,
      revenueCollectedCents: aggregateMoney(v.inputs).revenueCollectedCents,
    }))
    .sort((a, b) => b.revenueCollectedCents - a.revenueCollectedCents);
  const anyRevenue = sourceRevenueRows.some((r) => r.revenueCollectedCents > 0);
  const sourceRevenue: SourceRevenueResult = {
    hasEnoughData: totalSourceBookings >= REFERRAL_MIN_BOOKINGS && anyRevenue,
    rows: sourceRevenueRows,
  };

  // UTM campaigns — explicit utm_campaign values only. utm_source paired
  // is the most-common companion for that campaign in the window.
  const campaignCounts = new Map<
    string,
    { count: number; sources: Map<string, number> }
  >();
  let utmTaggedTotal = 0;
  for (const r of windowRows) {
    if (!r.utm_campaign) continue;
    utmTaggedTotal += 1;
    const cur = campaignCounts.get(r.utm_campaign) ?? {
      count: 0,
      sources: new Map<string, number>(),
    };
    cur.count += 1;
    if (r.utm_source) {
      cur.sources.set(r.utm_source, (cur.sources.get(r.utm_source) ?? 0) + 1);
    }
    campaignCounts.set(r.utm_campaign, cur);
  }
  const utmCampaignRows: UtmCampaignRow[] = Array.from(campaignCounts.entries())
    .map(([utmCampaign, v]) => {
      let topSource: string | null = null;
      let topSourceCount = 0;
      for (const [s, c] of v.sources) {
        if (c > topSourceCount) {
          topSource = s;
          topSourceCount = c;
        }
      }
      return { utmCampaign, utmSource: topSource, bookingCount: v.count };
    })
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 5);
  const utmCampaigns: UtmCampaignsResult = {
    hasEnoughData: utmTaggedTotal >= 5,
    totalUtmTaggedBookings: utmTaggedTotal,
    rows: utmCampaignRows,
  };

  // ── Pass the Torch attribution (Phase 5 closer) ──────────────────
  // Aggregates over the same windowRows already in memory. The
  // referring_business join is included in the SELECT so the top
  // referrers list gets the display name without an extra round-trip.
  // Sample-size guard ≥1 — Pass the Torch is rare enough that we
  // surface it as soon as it exists.
  const ptBookings = windowRows.filter((r) => r.referrer_business_id);
  const ptByReferrer = new Map<string, { count: number; name: string }>();
  const ptMoneyInputs: MoneyInput[] = [];
  for (const r of ptBookings) {
    if (!r.referrer_business_id) continue;
    const join = pickFirst(r.referring_business);
    const name = join?.business_name ?? "Former pro";
    const cur = ptByReferrer.get(r.referrer_business_id) ?? { count: 0, name };
    cur.count += 1;
    cur.name = name;
    ptByReferrer.set(r.referrer_business_id, cur);

    const svc = pickFirst(r.services);
    ptMoneyInputs.push({
      depositPaid: !!r.deposit_paid,
      paidInFullAt: r.paid_in_full_at,
      paidAmountCents: r.paid_amount_cents ?? 0,
      priceCents: svc?.price_cents ?? 0,
      depositCents: svc?.deposit_cents ?? 0,
    });
  }
  const ptTopReferrers: PassTheTorchTopReferrer[] = Array.from(
    ptByReferrer.entries(),
  )
    .map(([referrerBusinessId, v]) => ({
      referrerBusinessId,
      name: v.name,
      bookingCount: v.count,
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 3);
  const passTheTorch: PassTheTorchData = {
    hasAny: ptBookings.length > 0,
    bookingCount: ptBookings.length,
    uniqueReferringPros: ptByReferrer.size,
    revenueCollectedCents: aggregateMoney(ptMoneyInputs).revenueCollectedCents,
    topReferrers: ptTopReferrers,
  };

  return {
    timeZone,
    acquisition,
    origin,
    topSources,
    sourceRevenue,
    utmCampaigns,
    passTheTorch,
  };
}

// ────────────────────────────────────────────────────────────────────
// Phase 5 closer — Storefront view tracking analytics
// ────────────────────────────────────────────────────────────────────
//
// Computes everything the 3 view-tracking cards need from a single
// batched query against storefront_views (migration 047) plus a
// reuse of the bookings query for conversion rate math:
//
//   StorefrontViewsCard       — total + 8-week trend
//   ConversionRateCard        — views / bookings, last 90 days
//   ConversionBySourceCard    — per-source conversion rate
//
// Source attribution for views uses the same attributeSource()
// helper as bookings (treating views as if booking_source =
// 'public_widget' since that's implicit for storefront visits).
// Single source of truth for source bucketing across views and
// bookings.

const VIEWS_WINDOW_DAYS = 90;
const VIEWS_TREND_WEEKS = 8;
const VIEWS_MIN_BOOKINGS = 10;
const VIEWS_MIN_PER_SOURCE = 10;

export type ViewsTrendPoint = {
  weekStart: Date;
  label: string;
  count: number;
};

export type ConversionBySourceRow = {
  source: string;
  views: number;
  bookings: number;
  /** bookings / views, in [0, 1]. */
  conversionRate: number;
};

export type ConversionBySourceResult = {
  /** True when ≥1 source has ≥VIEWS_MIN_PER_SOURCE views. */
  hasEnoughData: boolean;
  /** Sources sorted by views desc, filtered to those with ≥10 views. */
  rows: ConversionBySourceRow[];
};

export type ViewsData = {
  timeZone: string;
  totalViews: number;
  /** True when ≥VIEWS_MIN_BOOKINGS views in window — drives Views and Conversion Rate cards. */
  hasEnoughData: boolean;
  /** 8 weekly buckets, oldest first. Latest bucket is the current week. */
  trend: ViewsTrendPoint[];
  /** Cancelled bookings excluded from this count — same rule as the rest of Business Brain. */
  totalBookings: number;
  /** totalBookings / totalViews; 0 when totalViews is 0. */
  conversionRate: number;
  bySource: ConversionBySourceResult;
};

export async function getViewsData(
  businessId: string,
  timeZone: string,
): Promise<ViewsData> {
  return unstable_cache(
    async () => computeViewsData(businessId, timeZone),
    ["business-brain-views", businessId, timeZone],
    { revalidate: 3600 },
  )();
}

type ViewRow = {
  viewed_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_url: string | null;
  referrer_business_id: string | null;
};

type ViewBookingRow = {
  start_at: string;
  status: string;
  booking_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_url: string | null;
  referrer_business_id: string | null;
};

async function computeViewsData(
  businessId: string,
  timeZone: string,
): Promise<ViewsData> {
  const admin = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - VIEWS_WINDOW_DAYS * MS_DAY);
  const trendStart = new Date(now.getTime() - VIEWS_TREND_WEEKS * 7 * MS_DAY);

  // Two queries in parallel:
  //   1. Views in the wider of [trendStart, 90-day window]
  //   2. Non-cancelled bookings in 90-day window (for conversion math)
  // Both are filtered to the business and run with index-only scans.
  const fetchStart = new Date(
    Math.min(windowStart.getTime(), trendStart.getTime()),
  );
  const [viewsRes, bookingsRes] = await Promise.all([
    admin
      .from("storefront_views")
      .select(
        "viewed_at, utm_source, utm_medium, utm_campaign, referrer_url, referrer_business_id",
      )
      .eq("business_id", businessId)
      .gte("viewed_at", fetchStart.toISOString())
      .lt("viewed_at", now.toISOString()),
    admin
      .from("bookings")
      .select(
        "start_at, status, booking_source, utm_source, utm_medium, utm_campaign, referrer_url, referrer_business_id",
      )
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .gte("start_at", windowStart.toISOString())
      .lt("start_at", now.toISOString()),
  ]);

  const allViews = (viewsRes.data ?? []) as ViewRow[];
  const last90Views = allViews.filter(
    (v) => new Date(v.viewed_at).getTime() >= windowStart.getTime(),
  );
  const bookings = (bookingsRes.data ?? []) as ViewBookingRow[];

  // ── Total + sample-size flag ───────────────────────────────────────
  const totalViews = last90Views.length;
  const totalBookings = bookings.length;
  const hasEnoughData = totalViews >= VIEWS_MIN_BOOKINGS;
  const conversionRate = totalViews > 0 ? totalBookings / totalViews : 0;

  // ── Weekly trend (8 weeks ending this week) ────────────────────────
  // Bucket by week-start in pro tz. Reuses getWeekRange's Mon-anchored
  // boundary for "this week."
  const { weekStart: thisWeekStart } = getWeekRange(timeZone);
  const trend: ViewsTrendPoint[] = [];
  for (let i = VIEWS_TREND_WEEKS - 1; i >= 0; i -= 1) {
    const weekStart = new Date(thisWeekStart.getTime() - i * 7 * MS_DAY);
    trend.push({
      weekStart,
      label: new Intl.DateTimeFormat("en-US", {
        timeZone,
        month: "short",
        day: "numeric",
      }).format(weekStart),
      count: 0,
    });
  }
  for (const v of allViews) {
    const t = new Date(v.viewed_at).getTime();
    for (const bucket of trend) {
      const bucketStart = bucket.weekStart.getTime();
      const bucketEnd = bucketStart + 7 * MS_DAY;
      if (t >= bucketStart && t < bucketEnd) {
        bucket.count += 1;
        break;
      }
    }
  }

  // ── Conversion by source ───────────────────────────────────────────
  // Bucket views by attributed source; bucket bookings by attributed
  // source; for each source with ≥VIEWS_MIN_PER_SOURCE views, compute
  // bookings/views. Sources below the per-source threshold are
  // dropped — a source with 2 views and 1 booking would show 50%
  // which is noise.
  //
  // IMPORTANT: this card uses attributeSourceForConversion (5-tier),
  // NOT the canonical 6-tier attributeSource. Survey response is
  // skipped for conversion bucketing because storefront views don't
  // carry survey data — bucketing bookings by survey while bucketing
  // views by inferred signal would produce nonsense rows like
  // "Instagram (self-reported): 0 views, 3 bookings, ∞%". Survey-
  // attributed bookings still appear correctly on TopSourcesCard /
  // SourceRevenueCard via attributeSource; they're just bucketed by
  // their non-survey signal here for funnel math.
  const viewsBySource = new Map<string, number>();
  for (const v of last90Views) {
    const src = attributeSourceForConversion({
      utm_source: v.utm_source,
      referrer_url: v.referrer_url,
      // Storefront views are implicitly via the public widget surface —
      // there's no concept of a "manual view." Pass 'public_widget'
      // so the priority chain treats them consistently with public
      // bookings.
      booking_source: "public_widget",
      referrer_business_id: v.referrer_business_id,
    });
    viewsBySource.set(src, (viewsBySource.get(src) ?? 0) + 1);
  }
  const bookingsBySource = new Map<string, number>();
  for (const b of bookings) {
    const src = attributeSourceForConversion({
      utm_source: b.utm_source,
      referrer_url: b.referrer_url,
      booking_source: b.booking_source,
      referrer_business_id: b.referrer_business_id,
    });
    bookingsBySource.set(src, (bookingsBySource.get(src) ?? 0) + 1);
  }
  const bySourceRows: ConversionBySourceRow[] = Array.from(viewsBySource.entries())
    .filter(([, views]) => views >= VIEWS_MIN_PER_SOURCE)
    .map(([source, views]) => {
      const bks = bookingsBySource.get(source) ?? 0;
      return {
        source,
        views,
        bookings: bks,
        conversionRate: views > 0 ? bks / views : 0,
      };
    })
    .sort((a, b) => b.views - a.views);
  const bySource: ConversionBySourceResult = {
    hasEnoughData: bySourceRows.length > 0,
    rows: bySourceRows,
  };

  return {
    timeZone,
    totalViews,
    hasEnoughData,
    trend,
    totalBookings,
    conversionRate,
    bySource,
  };
}
