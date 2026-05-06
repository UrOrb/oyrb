// Reputation strike accumulation + auto-pause (Phase 2.2).
//
// Single source of truth for strike standing: derived at query time from
// `dispute_inquiries` rows. We do NOT keep cumulative counter columns on
// `businesses` — see migration 041 for the rationale.
//
// Thresholds (per TOS Section 29):
//   - 3 resolved strikes OR weighted total ≥ 5 → auto-pause storefront
//   - 14-day rolling window for accumulation
//
// Section 29 itself does NOT mention the 14-day window — that's an
// implementation choice strictly more pro-friendly than the TOS as
// written. Lawyer review of Section 29 (tracked in PR 2.4) should
// reconcile the two.
//
// What counts as a strike against a business:
//   - dispute_inquiries.business_id = $businessId
//   - dispute_inquiries.reporter_type = 'client'   (only client-filed
//                                                   complaints accumulate
//                                                   against the pro;
//                                                   pro-filed disputes
//                                                   resolved as 'strike'
//                                                   don't pause the pro
//                                                   themselves)
//   - dispute_inquiries.status = 'resolved_strike'
//   - dispute_inquiries.resolved_at > now() - 14 days
//
// Note on duplication with billing pause: the existing billing-failure
// pause (PR #15, migration 034) writes is_published=false inline in
// `src/app/api/cron/subscription-warnings/route.ts` and clears it inline
// in `src/app/api/stripe/webhook/route.ts`. There is no shared helper.
// Phase 2.2 deliberately does NOT refactor that into a unified helper —
// the patterns work, and conflating them risks regressing billing logic.
// Known follow-up cleanup: extract a single `pauseBusiness(reason)` /
// `unpauseBusiness(reason)` once we have a third pause reason or a
// concrete need to consolidate.

import { createAdminClient } from "@/lib/supabase/server";

export const STRIKE_THRESHOLD_COUNT = 3;
export const STRIKE_THRESHOLD_WEIGHTED = 5;
export const STRIKE_WINDOW_DAYS = 14;
const STRIKE_WINDOW_MS = STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export type StrikeStanding = {
  count: number;
  weightedTotal: number;
  thresholdCount: number;
  thresholdWeighted: number;
  windowDays: number;
  isPaused: boolean;
  pausedAt: Date | null;
  /** strikes-until-pause (count-based). Negative if past threshold. */
  countToThreshold: number;
  /** weight-until-pause. Negative if past threshold. */
  weightedToThreshold: number;
  /** True iff one more weight-1 strike OR one more raw count would trigger pause. */
  approachingThreshold: boolean;
  /** True iff this strike just crossed either threshold. Caller decides whether to fire pause. */
  meetsThreshold: boolean;
};

/**
 * Compute current strike standing for a business from
 * `dispute_inquiries`. Cheap — single indexed query, scoped to one
 * business, typically returns < 10 rows.
 *
 * `isPaused` reads `businesses.strike_paused_at` which is the canonical
 * pause marker (cleared on admin unpause).
 */
export async function getStrikeStanding(businessId: string): Promise<StrikeStanding> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - STRIKE_WINDOW_MS).toISOString();

  // Concurrent: standing query + pause-state query.
  const [standingRes, bizRes] = await Promise.all([
    admin
      .from("dispute_inquiries")
      .select("weight")
      .eq("business_id", businessId)
      .eq("reporter_type", "client")
      .eq("status", "resolved_strike")
      .gte("resolved_at", since),
    admin
      .from("businesses")
      .select("strike_paused_at")
      .eq("id", businessId)
      .maybeSingle(),
  ]);

  const rows = (standingRes.data ?? []) as Array<{ weight: number }>;
  const count = rows.length;
  const weightedTotal = rows.reduce((sum, r) => sum + (r.weight ?? 1), 0);

  const pausedAtIso = (bizRes.data as { strike_paused_at: string | null } | null)?.strike_paused_at ?? null;
  const pausedAt = pausedAtIso ? new Date(pausedAtIso) : null;

  const countToThreshold = STRIKE_THRESHOLD_COUNT - count;
  const weightedToThreshold = STRIKE_THRESHOLD_WEIGHTED - weightedTotal;
  const meetsThreshold = count >= STRIKE_THRESHOLD_COUNT || weightedTotal >= STRIKE_THRESHOLD_WEIGHTED;

  // Approaching = "one more strike of any weight could trigger pause".
  // Conservative: pro is approaching when either threshold-1 is met by
  // count, OR a weight-3 strike would push them past the weighted
  // threshold. Avoids surprising a pro with a sudden pause.
  const approachingThreshold =
    !meetsThreshold &&
    (count >= STRIKE_THRESHOLD_COUNT - 1 || weightedTotal >= STRIKE_THRESHOLD_WEIGHTED - 3);

  return {
    count,
    weightedTotal,
    thresholdCount: STRIKE_THRESHOLD_COUNT,
    thresholdWeighted: STRIKE_THRESHOLD_WEIGHTED,
    windowDays: STRIKE_WINDOW_DAYS,
    isPaused: !!pausedAt,
    pausedAt,
    countToThreshold,
    weightedToThreshold,
    approachingThreshold,
    meetsThreshold,
  };
}

/**
 * Side-effects of a fresh strike. Call AFTER the dispute_inquiries row
 * has been updated to status='resolved_strike'. The just-updated row
 * is included in the rolling-window query that drives the standing.
 *
 * Returns the post-strike standing plus a `triggeredPause` flag the
 * caller can use to decide which email to send.
 */
export async function recordStrike(businessId: string): Promise<{
  standing: StrikeStanding;
  triggeredPause: boolean;
}> {
  const admin = createAdminClient();
  const now = new Date();

  // Stamp last_strike_at unconditionally — pure audit marker.
  await admin
    .from("businesses")
    .update({ last_strike_at: now.toISOString() })
    .eq("id", businessId);

  const standing = await getStrikeStanding(businessId);

  // Pause if we just crossed threshold AND aren't already paused. The
  // is_published filter is defense-in-depth — a strike-paused business
  // already has is_published=false; this prevents flipping a hand-paused
  // storefront's hidden state.
  let triggeredPause = false;
  if (standing.meetsThreshold && !standing.isPaused) {
    const { data: paused } = await admin
      .from("businesses")
      .update({
        is_published: false,
        strike_paused_at: now.toISOString(),
      })
      .eq("id", businessId)
      .is("strike_paused_at", null)
      .select("id");
    triggeredPause = (paused?.length ?? 0) > 0;
    if (triggeredPause) {
      // Refetch standing so the returned `isPaused` and `pausedAt` are
      // truthful for callers chaining email logic off this result.
      const fresh = await getStrikeStanding(businessId);
      return { standing: fresh, triggeredPause };
    }
  }

  return { standing, triggeredPause };
}

/**
 * Admin-only manual unpause. Clears `strike_paused_at` and re-publishes
 * the storefront. Past dispute records remain in `dispute_inquiries`
 * for audit.
 *
 * Note: we don't "zero out" anything because we don't keep cumulative
 * counters. Once `strike_paused_at` is cleared and ~14 days pass, the
 * rolling-window query naturally returns to a clean state. Strikes
 * accumulated within the window stay visible to the pro until they age
 * out — that's intentional, so the pro can see the standing the admin
 * acted on.
 *
 * Caller is responsible for the requireAdmin gate.
 */
export async function unpauseFromStrike(businessId: string): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("businesses")
    .update({
      is_published: true,
      strike_paused_at: null,
    })
    .eq("id", businessId)
    .not("strike_paused_at", "is", null);

  if (error) {
    console.error("unpauseFromStrike failed:", error);
    return { error: "Couldn't unpause the storefront." };
  }
  return { ok: true };
}
