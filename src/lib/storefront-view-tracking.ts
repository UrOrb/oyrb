// Storefront view tracking (Phase 5 closer).
//
// Records one row per "meaningful" storefront view in
// public.storefront_views (migration 047). Called from the
// storefront page server component via Next.js 16's after() so
// the INSERT runs after the response is committed — view tracking
// never blocks rendering.
//
// "Meaningful" means:
//   - The visitor reached an actual business (notFound() didn't fire)
//   - The visitor is NOT the storefront's own owner (skip owner-preview hits)
//   - This session hasn't already viewed this business in the last
//     30 minutes (dedup window)
//
// Privacy:
//   - Raw IP is NEVER stored. ip_hash = SHA-256(salt + ip), salt
//     from STOREFRONT_VIEW_IP_HASH_SALT env var. One-way; never
//     reverse-able without the salt; never displayed.
//   - user_agent stored as-is for future bot-pattern analysis ONLY.
//     Never displayed in any UI.
//   - referrer_url already stripped of query string + fragment by
//     the proxy at cookie-set time (hostname + pathname only).

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

const DEDUP_WINDOW_MS = 30 * 60 * 1000;

/**
 * Fire-and-forget INSERT. Called inside `after()` from the storefront
 * page. Errors are logged but never thrown — view tracking failure
 * must not affect the rendered storefront.
 *
 * Returns Promise<void> so callers can `await` it inside an `after()`
 * callback. The `after()` runtime handles the deferred execution and
 * suppresses errors; this function adds defense-in-depth try/catch
 * for any error that escapes.
 */
export async function recordStorefrontView(params: {
  businessId: string;
  sessionId: string;
  referrerUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerBusinessId: string | null;
  userAgent: string | null;
  ipHash: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();

    // Dedup check — has this session viewed this business in the last
    // 30 minutes? Single index-only lookup against
    // idx_storefront_views_session_id (further filtered in-memory by
    // business_id and viewed_at >= cutoff). If yes → no-op.
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    const { data: existing } = await admin
      .from("storefront_views")
      .select("id")
      .eq("business_id", params.businessId)
      .eq("session_id", params.sessionId)
      .gte("viewed_at", cutoff)
      .limit(1);
    if (existing && existing.length > 0) return;

    await admin.from("storefront_views").insert({
      business_id: params.businessId,
      session_id: params.sessionId,
      referrer_url: params.referrerUrl,
      utm_source: params.utmSource,
      utm_medium: params.utmMedium,
      utm_campaign: params.utmCampaign,
      referrer_business_id: params.referrerBusinessId,
      user_agent: params.userAgent,
      ip_hash: params.ipHash,
    });
  } catch (err) {
    // Fire-and-forget — log but never throw. The page has already
    // rendered and committed; we just lost a view row.
    console.error("[storefront-view-tracking] INSERT failed:", err);
  }
}

/**
 * SHA-256 hash of (salt + ip). One-way; never reverse-able without
 * the salt.
 *
 * Graceful degradation in dev: when STOREFRONT_VIEW_IP_HASH_SALT is
 * unset (typical for local dev), returns NULL instead of erroring.
 * View row still gets recorded with ip_hash = NULL — analytics aren't
 * affected since ip_hash isn't surfaced in any UI; the column exists
 * for future bot-pattern analysis only.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.STOREFRONT_VIEW_IP_HASH_SALT;
  if (!salt) return null;
  return crypto.createHash("sha256").update(salt + ip).digest("hex");
}

/**
 * Extract the client IP from request headers. Vercel sets
 * `x-forwarded-for` reliably; the first comma-separated value is the
 * client. Falls back to `x-real-ip` (some non-Vercel proxies). Returns
 * NULL when neither header is present.
 */
export function extractClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = headers.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}
