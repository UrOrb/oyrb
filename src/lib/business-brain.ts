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

export type MoneyThisWeek = {
  /** Sum of services.price_cents for confirmed+completed bookings starting this week. Excludes cancelled. */
  grossCents: number;
  /** Count of bookings this week with deposit_paid=true. */
  depositsCount: number;
  /** Sum of services.deposit_cents for those bookings. */
  depositsTotalCents: number;
  /** Count of bookings this week with paid_in_full_at IS NOT NULL. */
  payInFullCount: number;
  /** Sum of paid_amount_cents for those bookings. */
  payInFullTotalCents: number;
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
  const money: MoneyThisWeek = thisWeekRows.reduce<MoneyThisWeek>(
    (acc, r) => {
      const isCancelled = r.status === "cancelled";
      const svc = pickFirst(r.services);
      const price = svc?.price_cents ?? 0;
      const dep = svc?.deposit_cents ?? 0;
      if (!isCancelled) acc.grossCents += price;
      if (!isCancelled && r.deposit_paid) {
        acc.depositsCount += 1;
        acc.depositsTotalCents += dep;
      }
      if (!isCancelled && r.paid_in_full_at) {
        acc.payInFullCount += 1;
        acc.payInFullTotalCents += r.paid_amount_cents ?? 0;
      }
      return acc;
    },
    {
      grossCents: 0,
      depositsCount: 0,
      depositsTotalCents: 0,
      payInFullCount: 0,
      payInFullTotalCents: 0,
    },
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
