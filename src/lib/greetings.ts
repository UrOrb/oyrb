// Time-of-day-aware greeting copy for the dashboard root.
//
// Picks a greeting deterministically per (user, day-in-tz) so a single
// pro sees the same greeting all day but a different one tomorrow.
// Random-per-page-load makes the dashboard feel twitchy (refresh = new
// greeting); deterministic-per-day means the platform appears to
// "remember" them. Each day, the hash rolls the dice once.
//
// Three time-of-day buckets (in the pro's tz), four variations each.
// Late-night and pre-dawn fall back to the "evening" bucket — the pro
// is up late, treat it as continuation of their day.
//
// Name resolution: prefer the first token of `full_name`; fall back to
// `business_name` (so "Welcome back to Lania Renee" reads naturally
// even when the pro never set a display name). Final fallback drops
// the comma entirely.

export type TimeOfDay = "morning" | "afternoon" | "evening";

const GREETINGS: Record<TimeOfDay, readonly string[]> = {
  morning: [
    "Good morning, {name}",
    "Welcome back, {name}",
    "Hey {name}, ready for today?",
    "{name} — let's make it a good one",
  ],
  afternoon: [
    "Good afternoon, {name}",
    "Hey {name}",
    "Welcome back, {name}",
    "{name} — how's the day going?",
  ],
  evening: [
    "Good evening, {name}",
    "Welcome back, {name}",
    "Hey {name}",
    "{name} — wrapping up?",
  ],
};

const NAMELESS_GREETINGS: Record<TimeOfDay, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

/**
 * Derives the time-of-day bucket from the pro's timezone-local hour.
 * Cutoffs (per build prompt):
 *   morning    05:00 – 11:59
 *   afternoon  12:00 – 16:59
 *   evening    17:00 – 23:59  (and 00:00 – 04:59 falls through to here)
 */
export function getTimeOfDay(timeZone: string, now: Date = new Date()): TimeOfDay {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  });
  // Intl returns hours 00-23; "24" only appears under a specific
  // formatToParts edge case that this `hour` extraction won't hit.
  const hour = Number(fmt.format(now).slice(0, 2));
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/**
 * Returns the date-in-tz as a YYYY-MM-DD string. Used as the daily
 * seed so the greeting rolls over at local midnight, not UTC midnight.
 */
function dateKeyInTz(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Tiny deterministic hash — userId + date key → variation index.
 * djb2 is overkill for "pick one of 4," but it's fast, dependency-free,
 * and the distribution across 4 buckets is even enough for our use.
 */
function pickIndex(seed: string, modulo: number): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulo;
}

/**
 * Resolve the name token to interpolate into the greeting. First-name
 * preferred; business name otherwise; null when neither is available
 * (caller falls back to NAMELESS_GREETINGS).
 */
export function resolveGreetingName(input: {
  fullName?: string | null;
  businessName?: string | null;
}): string | null {
  const first = input.fullName?.trim().split(/\s+/)[0];
  if (first && first.length > 0) return first;
  const biz = input.businessName?.trim();
  if (biz && biz.length > 0) return biz;
  return null;
}

/**
 * The full picker. Returns the rendered greeting string for the given
 * user, tz, and naming inputs. Stable across the same UTC date in the
 * pro's timezone; rolls over at local midnight.
 */
export function pickGreeting(input: {
  userId: string;
  timeZone: string;
  fullName?: string | null;
  businessName?: string | null;
  /** Override for tests. Defaults to `new Date()` (current instant). */
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const bucket = getTimeOfDay(input.timeZone, now);
  const name = resolveGreetingName({
    fullName: input.fullName,
    businessName: input.businessName,
  });
  if (!name) return NAMELESS_GREETINGS[bucket];
  const dateKey = dateKeyInTz(input.timeZone, now);
  const variations = GREETINGS[bucket];
  const idx = pickIndex(`${input.userId}|${dateKey}`, variations.length);
  return variations[idx].replace("{name}", name);
}
