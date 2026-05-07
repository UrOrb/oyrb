// Public reputation stats (Phase 2.3).
//
// Computes positive trust signals from real booking + dispute data over
// a rolling 90-day window for display on the public storefront.
//
// Privacy commitments enforced here (not just in UI):
//   - No raw strike count is ever surfaced. We expose
//     hasZeroRecentStrikes / hasActiveStrikes booleans only.
//   - No specific clients, dispute reasons, or comparisons across pros.
//   - No tier label of any kind for pros with active strikes (all
//     three tiers — Trusted, Established, Rising — require zero recent
//     strikes per the rolling 14-day window).
//   - Sample-size minimum of 10 completed bookings in the window. Below
//     threshold returns null and the call site renders an "Earning
//     trust" empty state (when public_stats_enabled is on) or nothing
//     (when off).
//
// Cache: results are wrapped in unstable_cache with a 1-hour TTL keyed
// on businessId. Stale-window caveat: when a pro crosses the strike
// threshold and their storefront auto-pauses, the cached "trust
// signals" payload could linger up to 60 minutes. Acceptable because
// the storefront returns 404 on pause (Phase 2.2) — the page never
// renders, so the cached payload is unreachable anyway. Manual cache
// invalidation on strike events would be defense-in-depth but isn't
// load-bearing.

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getStrikeStanding, STRIKE_WINDOW_DAYS } from "@/lib/strikes";

export const REPUTATION_WINDOW_DAYS = 90;
export const MIN_COMPLETED_BOOKINGS = 10;
export const MIN_UNIQUE_CLIENTS_FOR_REPEAT_RATE = 10;

const TIER_TRUSTED_COMPLETION = 0.9;
const TIER_TRUSTED_REPEAT = 0.3;
const TIER_ESTABLISHED_COMPLETION = 0.8;
const TIER_RISING_COMPLETION = 0.7;

export type ReputationTier = "trusted" | "established" | "rising";

export type ReputationStats = {
  /** Number of completed bookings in the 90-day window. Always ≥ MIN_COMPLETED_BOOKINGS when this object is returned. */
  completedCount: number;
  /** Pro-initiated cancellations in the window. cancelled_by = 'pro' only — client cancellations and legacy NULL rows are excluded. */
  proCancelledCount: number;
  /** Unique clients with bookings in the window (any status, non-null client_id). */
  uniqueClientsCount: number;
  /**
   * completed / (completed + pro-cancelled). Always defined when this
   * object is returned (denominator ≥ MIN_COMPLETED_BOOKINGS).
   */
  completionRate: number;
  /**
   * Repeat-client rate: bookings from clients with ≥2 bookings in the
   * window, divided by total bookings with non-null client_id.
   * null when fewer than MIN_UNIQUE_CLIENTS_FOR_REPEAT_RATE unique
   * clients — in that case the rate isn't surfaced on the card.
   */
  repeatClientRate: number | null;
  /** True when getStrikeStanding(business_id).count === 0 in the 14-day window. */
  hasZeroRecentStrikes: boolean;
  /** True when the pro has active strikes — drives the partial-card mode (no tier, no badge). */
  hasActiveStrikes: boolean;
  /**
   * Tier label or null. null when hasActiveStrikes is true OR when the
   * pro doesn't meet any tier's completion-rate floor. The card renders
   * the rest of the stats either way; only the tier label is gated.
   */
  tier: ReputationTier | null;
  windowDays: number;
  strikeWindowDays: number;
};

const TIER_LABELS: Record<ReputationTier, string> = {
  trusted: "Trusted",
  established: "Established",
  rising: "Rising",
};

export function tierLabel(tier: ReputationTier): string {
  return TIER_LABELS[tier];
}

/**
 * Returns reputation stats for a business or null when the sample is
 * too small. Caller is responsible for the public_stats_enabled gate
 * (so the same helper feeds both the public storefront and the pro's
 * preview card in settings).
 *
 * Returning null cases:
 *   - Fewer than MIN_COMPLETED_BOOKINGS in the 90-day window
 *   - The business is strike-paused (defense-in-depth — the storefront
 *     404s on pause anyway, so this branch typically isn't reached)
 *   - Any internal error (logged; we fail closed rather than render
 *     misleading stats)
 */
export async function getReputationStats(
  businessId: string,
): Promise<ReputationStats | null> {
  return getCachedReputationStats(businessId);
}

function getCachedReputationStats(businessId: string): Promise<ReputationStats | null> {
  // unstable_cache key includes businessId so each business invalidates
  // independently. The keyParts array is what Next.js hashes for the
  // cache lookup; the inner fn doesn't take businessId because
  // closure-captured args don't participate in the key.
  return unstable_cache(
    async () => computeReputationStats(businessId),
    ["reputation-stats", businessId],
    { revalidate: 3600 },
  )();
}

async function computeReputationStats(
  businessId: string,
): Promise<ReputationStats | null> {
  try {
    const admin = createAdminClient();
    const windowStart = new Date(
      Date.now() - REPUTATION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const nowIso = new Date().toISOString();

    // Three concurrent queries: completed count, pro-cancelled count,
    // bookings (for repeat-client computation) + the existing strike
    // standing helper.
    const [completedRes, proCancelledRes, bookingsRes, strikeStanding] =
      await Promise.all([
        admin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "completed")
          .gte("end_at", windowStart)
          .lte("end_at", nowIso),
        // Pro-initiated cancellations only. cancelled_by = 'pro'
        // explicitly excludes NULL legacy rows (which would otherwise
        // mis-count as pro-cancellations under a != 'client' filter).
        admin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "cancelled")
          .eq("cancelled_by", "pro")
          .gte("start_at", windowStart),
        // Bookings with non-null client_id in the window — used for
        // repeat-client rate. Pull only what we need (client_id) so the
        // payload stays small.
        admin
          .from("bookings")
          .select("client_id")
          .eq("business_id", businessId)
          .gte("start_at", windowStart)
          .not("client_id", "is", null)
          .neq("status", "pending"),
        getStrikeStanding(businessId),
      ]);

    // Pause guard. The storefront 404s on strike-pause already (Phase
    // 2.2's existing /s/[slug] check), so this branch is rarely
    // reached, but defense-in-depth: never compute stats for a paused
    // business.
    if (strikeStanding.isPaused) return null;

    const completedCount = completedRes.count ?? 0;
    if (completedCount < MIN_COMPLETED_BOOKINGS) {
      return null;
    }

    const proCancelledCount = proCancelledRes.count ?? 0;
    const completionRate = completedCount / (completedCount + proCancelledCount);

    // Repeat-client rate: in the 90-day window, count clients with ≥2
    // bookings. Numerator = total bookings from those clients.
    // Denominator = total bookings with non-null client_id in window.
    // Returns null when fewer than MIN_UNIQUE_CLIENTS_FOR_REPEAT_RATE
    // unique clients (per spec).
    const bookingsByClient = new Map<string, number>();
    for (const b of (bookingsRes.data ?? []) as Array<{ client_id: string }>) {
      bookingsByClient.set(b.client_id, (bookingsByClient.get(b.client_id) ?? 0) + 1);
    }
    const uniqueClientsCount = bookingsByClient.size;
    const totalBookingsWithClient = Array.from(bookingsByClient.values()).reduce(
      (s, n) => s + n,
      0,
    );

    let repeatClientRate: number | null = null;
    if (uniqueClientsCount >= MIN_UNIQUE_CLIENTS_FOR_REPEAT_RATE && totalBookingsWithClient > 0) {
      const repeatBookings = Array.from(bookingsByClient.values())
        .filter((n) => n >= 2)
        .reduce((s, n) => s + n, 0);
      repeatClientRate = repeatBookings / totalBookingsWithClient;
    }

    const hasActiveStrikes = strikeStanding.count > 0;
    const hasZeroRecentStrikes = !hasActiveStrikes;

    // Tier rules (all three require zero recent strikes per spec):
    //   - trusted     : completion ≥ 90% AND repeat ≥ 30%
    //   - established : completion ≥ 80%
    //   - rising      : completion ≥ 70%
    //   - else null (no tier label rendered)
    let tier: ReputationTier | null = null;
    if (!hasActiveStrikes) {
      if (
        completionRate >= TIER_TRUSTED_COMPLETION &&
        repeatClientRate !== null &&
        repeatClientRate >= TIER_TRUSTED_REPEAT
      ) {
        tier = "trusted";
      } else if (completionRate >= TIER_ESTABLISHED_COMPLETION) {
        tier = "established";
      } else if (completionRate >= TIER_RISING_COMPLETION) {
        tier = "rising";
      }
    }

    return {
      completedCount,
      proCancelledCount,
      uniqueClientsCount,
      completionRate,
      repeatClientRate,
      hasZeroRecentStrikes,
      hasActiveStrikes,
      tier,
      windowDays: REPUTATION_WINDOW_DAYS,
      strikeWindowDays: STRIKE_WINDOW_DAYS,
    };
  } catch (err) {
    console.error("getReputationStats failed:", err);
    return null;
  }
}
