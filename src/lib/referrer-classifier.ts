// Referral signal helpers (Phase 5).
//
// Three pure functions used at both capture time (proxy / booking
// inserts) and display time (analytics):
//
//   sanitizeReferralValue   — two-pass sanitizer for UTM values and
//                             generic referrer strings
//   normalizeReferrerUrl    — strips query + fragment from a Referer
//                             header value, returns hostname + pathname
//                             only (or NULL on parse failure / self-
//                             referral)
//   classifyReferrer        — maps a referrer URL/hostname to one of a
//                             small known set of source buckets
//                             (instagram / tiktok / google / etc.)

const MAX_LENGTH = 255;
const HARD_REJECT_LENGTH = 2048;
// Control characters: \x00-\x1f (C0) and \x7f (DEL). Newlines (\n, \r)
// fall in this range. Test escape adapted to satisfy linter.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

/**
 * Two-pass sanitizer for any user-controlled URL-derived string.
 *
 *   Pass 1 (hard reject → NULL):
 *     - empty / null input
 *     - pre-truncation length > 2048 (someone is stuffing junk)
 *     - contains any control character (\n, \r, \0, etc.)
 *
 *   Pass 2 (normalize):
 *     - lowercase (lossy — campaign names like "Spring-Promo" become
 *       "spring-promo"; acceptable trade-off for honest aggregation)
 *     - trim leading + trailing whitespace
 *     - truncate to 255 characters
 *
 * Returns NULL when the value is rejected or empty after normalization.
 * NULL is the honest signal for missing data — analytics layer
 * downgrades to "Unknown" / "Direct" appropriately.
 */
export function sanitizeReferralValue(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  if (raw.length === 0) return null;
  if (raw.length > HARD_REJECT_LENGTH) return null;
  if (CONTROL_CHARS.test(raw)) return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_LENGTH);
}

/**
 * Extract a privacy-friendly representation of a Referer header value.
 * Strips query string + fragment so we never persist potentially-
 * sensitive URL params. Filters self-referrals (oyrb.space → oyrb.space
 * navigations) to NULL — industry-standard analytics behavior. Internal
 * navigations are not meaningful attribution signal.
 *
 * Returns NULL when:
 *   - input is missing or fails sanitizeReferralValue
 *   - URL won't parse
 *   - hostname matches OYRB's own domain (self-referral filter)
 *
 * Returns "{hostname}{pathname}" otherwise (no protocol, no port, no
 * query, no fragment), capped at 255 chars.
 */
export function normalizeReferrerUrl(rawReferer: string | null | undefined): string | null {
  const sanitized = sanitizeReferralValue(rawReferer);
  if (!sanitized) return null;
  let parsed: URL;
  try {
    parsed = new URL(sanitized);
  } catch {
    return null;
  }
  const host = parsed.hostname;
  if (!host) return null;
  // Self-referral filter — OYRB pages linking to OYRB pages aren't an
  // attribution signal worth recording.
  if (host === "oyrb.space" || host.endsWith(".oyrb.space")) return null;
  const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
  return `${host}${path}`.slice(0, MAX_LENGTH);
}

/**
 * Map a referrer URL or hostname to a coarse source bucket. Used at
 * display time in analytics — we don't store the classified value.
 *
 * Buckets in v1:
 *   instagram, tiktok, google, facebook, twitter, youtube, linktree,
 *   pinterest, direct, other
 *
 * Hostname matching is suffix-based (instagram.com matches both
 * "instagram.com" and "www.instagram.com"). Returns 'direct' for
 * empty/null, 'other' for unknown hostnames.
 */
export type ClassifiedReferrer =
  | "instagram"
  | "tiktok"
  | "google"
  | "facebook"
  | "twitter"
  | "youtube"
  | "linktree"
  | "pinterest"
  | "direct"
  | "other";

const HOSTNAME_BUCKETS: Array<{ bucket: ClassifiedReferrer; suffixes: string[] }> = [
  { bucket: "instagram", suffixes: ["instagram.com", "ig.me", "l.instagram.com"] },
  { bucket: "tiktok",    suffixes: ["tiktok.com", "l.tiktok.com", "vm.tiktok.com"] },
  { bucket: "google",    suffixes: ["google.com", "l.google.com", "google.co.uk", "google.ca"] },
  { bucket: "facebook",  suffixes: ["facebook.com", "fb.com", "l.facebook.com", "m.facebook.com", "lm.facebook.com"] },
  { bucket: "twitter",   suffixes: ["twitter.com", "t.co", "x.com", "mobile.twitter.com"] },
  { bucket: "youtube",   suffixes: ["youtube.com", "youtu.be", "m.youtube.com"] },
  { bucket: "linktree",  suffixes: ["linktr.ee", "l.linktr.ee"] },
  { bucket: "pinterest", suffixes: ["pinterest.com", "pin.it", "pinterest.ca", "pinterest.co.uk"] },
];

export function classifyReferrer(referrerUrlOrHost: string | null | undefined): ClassifiedReferrer {
  if (!referrerUrlOrHost) return "direct";
  // Accept either "instagram.com/foo" (already normalized) or
  // "https://www.instagram.com/foo" (raw URL). Extract hostname either
  // way.
  let host = "";
  if (referrerUrlOrHost.includes("://")) {
    try {
      host = new URL(referrerUrlOrHost).hostname.toLowerCase();
    } catch {
      return "other";
    }
  } else {
    // First path-or-end segment is the hostname.
    host = referrerUrlOrHost.split("/")[0].toLowerCase();
  }
  if (!host) return "direct";
  for (const { bucket, suffixes } of HOSTNAME_BUCKETS) {
    for (const suffix of suffixes) {
      if (host === suffix || host.endsWith(`.${suffix}`)) return bucket;
    }
  }
  return "other";
}

/**
 * Display-friendly label for a classified bucket.
 * "Instagram" / "TikTok" / "Direct" etc. Used by analytics cards.
 */
const DISPLAY_LABELS: Record<ClassifiedReferrer, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  google: "Google",
  facebook: "Facebook",
  twitter: "X / Twitter",
  youtube: "YouTube",
  linktree: "Linktree",
  pinterest: "Pinterest",
  direct: "Direct",
  other: "Other",
};

export function classifiedReferrerLabel(c: ClassifiedReferrer): string {
  return DISPLAY_LABELS[c];
}

/**
 * Shape of the JSON payload stored in the oyrb_referral_session
 * cookie by the proxy. Read at booking-creation time by the public
 * booking routes and at storefront-view time by the view-tracker.
 *
 * session_id (Phase 5 closer): a UUID generated by the proxy on
 * first cookie set. STICKY across last-touch overwrites — the proxy
 * reads the existing cookie before writing, preserves the session_id
 * field, and rotates only the utm/referrer fields per visit. Used by
 * storefront view tracking for 30-minute dedup against
 * storefront_views.session_id.
 */
export type ReferralCookiePayload = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_url: string | null;
  /** Optional creator/influencer code from ?ref=, ?creator=, or ?influencer=. */
  influencer_code: string | null;
  /** Phase 5 closer — sticky across cookie's 24h life. */
  session_id: string | null;
  captured_at?: string;
};

/**
 * Parse a referral cookie value with defense-in-depth sanitization.
 * The proxy already sanitizes at write time; this re-applies it on
 * read so a malformed cookie (manually edited, or written by a stale
 * deploy) can't introduce control characters into the DB.
 *
 * Returns the all-NULL payload when the cookie is missing or
 * unparseable. session_id can be NULL legitimately for cookies set
 * by the proxy before this PR's deploy — in that case the
 * view-tracking caller skips the INSERT (no session = no dedup
 * possible).
 */
export function parseReferralCookie(
  rawCookieValue: string | null | undefined,
): ReferralCookiePayload {
  const empty: ReferralCookiePayload = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer_url: null,
    influencer_code: null,
    session_id: null,
  };
  if (!rawCookieValue) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawCookieValue);
  } catch {
    return empty;
  }
  if (!parsed || typeof parsed !== "object") return empty;
  const obj = parsed as Record<string, unknown>;
  const get = (k: string) =>
    typeof obj[k] === "string" ? sanitizeReferralValue(obj[k] as string) : null;
  // session_id is NOT routed through sanitizeReferralValue — it's a
  // UUID v4 we generated; lowercasing or truncating could corrupt it.
  // Just validate the shape.
  const rawSession =
    typeof obj.session_id === "string" ? obj.session_id : null;
  const session_id =
    rawSession && /^[0-9a-f-]{1,64}$/i.test(rawSession) ? rawSession : null;
  return {
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    referrer_url: get("referrer_url"),
    influencer_code: get("influencer_code"),
    session_id,
  };
}

export const REFERRAL_COOKIE_NAME = "oyrb_referral_session";
