/**
 * Pure utilities for the bookings week-view.
 *
 * All times in / out are UTC instants; conversion to/from the pro's
 * local clock is owned here so the React components stay declarative.
 *
 * The week-anchor (?week=YYYY-MM-DD) names the Monday of the visible
 * week in the pro's local timezone — same convention as
 * getWeekRange(timeZone) in src/lib/business-brain.ts:169, which we
 * reuse for the "no ?week param" current-week path. parseMondayParam
 * exists for navigated weeks where we need to honor the URL anchor
 * exactly without re-deriving "today's Monday."
 */

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 22;
export const SLOT_HEIGHT_PX = 60;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a `YYYY-MM-DD` `?week=` searchParam value into the UTC instant
 * for that local-Monday at 00:00 in the pro's timezone. Returns null
 * when the param is absent / malformed / not a real date — caller
 * should fall back to getWeekRange(timeZone).weekStart.
 *
 * Does NOT validate that the date is actually a Monday — the WeekNav
 * always produces Monday strings, but a hand-typed URL could land
 * mid-week. We honor it as the start of a 7-day window anyway; the
 * grid still renders 7 columns starting from that day.
 */
export function parseMondayParam(
  raw: string | undefined,
  timeZone: string,
): Date | null {
  if (!raw || !ISO_DATE_RE.test(raw)) return null;
  const [yStr, mStr, dStr] = raw.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  // Probe: does the local calendar in `timeZone` actually have this
  // date? Reject 2026-02-31 etc.
  const probeUtcMidday = new Date(Date.UTC(y, m - 1, d, 12));
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formatted = fmt.format(probeUtcMidday);
  if (formatted !== raw) return null;

  // Same DST-stable offset probe pattern as getWeekRange.
  const offsetMin = tzOffsetMinutes(probeUtcMidday, timeZone);
  return new Date(Date.UTC(y, m - 1, d, 0) - offsetMin * 60_000);
}

/**
 * Converts a UTC instant to fractional hours past midnight in the
 * given timezone. e.g. 9:30am local → 9.5. Used to compute the `top`
 * pixel offset of a booking block.
 */
export function hoursFromUtcInTimeZone(utc: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(utc).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const h = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  const m = Number(parts.minute);
  const s = Number(parts.second);
  return h + m / 60 + s / 3600;
}

/**
 * Returns YYYY-MM-DD for `instant` in `timeZone`. en-CA gives us the
 * ISO date format directly with no parsing.
 */
export function localDateString(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * Adds N days to a UTC instant by adding 24h × N — fine here because
 * we use the result only as an anchor that gets re-rounded to local
 * midnight downstream. Not safe across DST for "exactly 1 calendar
 * day" semantics; the WeekNav builds anchors via local Y/M/D math
 * for that reason.
 */
export function addDaysUtc(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Builds the local YYYY-MM-DD string that is `delta` days from
 * `anchorYmd` in the pro's timezone. delta can be negative.
 * Example: shiftLocalYmd("2026-05-12", 7, "America/New_York") →
 * "2026-05-19". DST-safe because we add at noon-local-UTC and
 * re-format in tz.
 */
export function shiftLocalYmd(
  anchorYmd: string,
  deltaDays: number,
  timeZone: string,
): string {
  const [y, m, d] = anchorYmd.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d + deltaDays, 12));
  return localDateString(noon, timeZone);
}

export type Lanable = { id: string; start_at: string; end_at: string };
export type Laned<T extends Lanable> = T & { lane: number; laneCount: number };

/**
 * Greedy lane-pack: visit bookings ordered by start_at, place each in
 * the lowest-indexed lane whose previous occupant ended ≤ this one
 * starts. Then for each block, attribute the laneCount as the maximum
 * lane index used within the cluster of overlapping blocks (so two
 * blocks that share at least one minute both render at 50% width
 * even when a third block in the cluster doesn't overlap them
 * directly).
 *
 * Returns the input order; positions are independent.
 */
export function lanePackOverlaps<T extends Lanable>(blocks: T[]): Laned<T>[] {
  const sorted = [...blocks].sort(
    (a, b) =>
      new Date(a.start_at).getTime() - new Date(b.start_at).getTime() ||
      new Date(a.end_at).getTime() - new Date(b.end_at).getTime(),
  );

  const laneEnds: number[] = []; // millis at which lane[i] becomes free
  const assignments = new Map<string, number>();

  for (const b of sorted) {
    const startMs = new Date(b.start_at).getTime();
    const endMs = new Date(b.end_at).getTime();
    let lane = 0;
    while (lane < laneEnds.length && laneEnds[lane] > startMs) lane++;
    laneEnds[lane] = endMs;
    assignments.set(b.id, lane);
  }

  // Cluster pass: union-find by overlap, then take max lane in each
  // cluster. O(n²) is fine for a single week (typically < 50 rows).
  const n = sorted.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < n; i++) {
    const aStart = new Date(sorted[i].start_at).getTime();
    const aEnd = new Date(sorted[i].end_at).getTime();
    for (let j = i + 1; j < n; j++) {
      const bStart = new Date(sorted[j].start_at).getTime();
      if (bStart >= aEnd) break;
      const bEnd = new Date(sorted[j].end_at).getTime();
      if (aStart < bEnd && bStart < aEnd) union(i, j);
    }
  }

  const clusterMaxLane = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const lane = assignments.get(sorted[i].id) ?? 0;
    const prev = clusterMaxLane.get(root) ?? 0;
    if (lane > prev) clusterMaxLane.set(root, lane);
  }

  return sorted.map((b, i) => {
    const lane = assignments.get(b.id) ?? 0;
    const laneCount = (clusterMaxLane.get(find(i)) ?? 0) + 1;
    return { ...b, lane, laneCount };
  });
}

// ── Local copy of the tz-offset probe used by getWeekRange. Kept
//    here (rather than imported) to avoid widening business-brain.ts
//    surface area for one helper. Pure function; same algorithm.
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
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
  const localUtcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((localUtcMs - date.getTime()) / 60_000);
}
