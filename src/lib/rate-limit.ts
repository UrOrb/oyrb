// Simple in-memory rate limiter for public API routes. Per warm Lambda
// instance — meaningful protection against single-IP loops, not a global
// quota. For production-grade cross-instance limits, swap this for
// @upstash/ratelimit + Upstash Redis. The interface below is the same so
// callers won't have to change.

type Bucket = { hits: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Clamp the map so it can't grow without bound under sustained attack.
const MAX_BUCKETS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Try to consume one hit from `key`'s bucket.
 * - `limit` total hits allowed within `windowMs`
 * - returns ok=false once the bucket is full; reset every `windowMs`
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    // Drop the oldest entries when the table gets too large.
    const cutoff = now - windowMs;
    for (const [k, b] of buckets) if (b.resetAt < cutoff) buckets.delete(k);
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    const fresh = { hits: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  existing.hits += 1;
  if (existing.hits > limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  return { ok: true, remaining: limit - existing.hits, resetAt: existing.resetAt };
}

/** Pull a best-effort caller IP from the standard Vercel/proxy headers. */
export function ipFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
