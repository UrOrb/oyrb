import { createAdminClient } from "@/lib/supabase/server";

// Global rate limiter for public/API routes. Production uses the
// Postgres-backed consume_rate_limit() RPC from migration 058 so limits
// apply across Vercel serverless instances. A tiny in-memory fallback is
// retained only for local development before migrations are applied.

type Bucket = { hits: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
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

/**
 * Try to consume one hit from `key`'s bucket.
 * - `limit` total hits allowed within `windowMs`
 * - returns ok=false once the bucket is full
 * - production counters are shared across instances via Supabase RPC
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("consume_rate_limit returned no row");

    return {
      ok: !!row.ok,
      remaining: Number(row.remaining ?? 0),
      resetAt: new Date(row.reset_at).getTime(),
    };
  } catch (err) {
    console.error("Rate limit backend unavailable:", err);
    if (process.env.NODE_ENV !== "production") {
      return memoryRateLimit(key, limit, windowMs);
    }
    // Fail closed in production. If the global limiter is unavailable,
    // expensive/public endpoints should not become unlimited.
    return { ok: false, remaining: 0, resetAt: Date.now() + windowMs };
  }
}

/** Pull a best-effort caller IP from the standard Vercel/proxy headers. */
export function ipFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
