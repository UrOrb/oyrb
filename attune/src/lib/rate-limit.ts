// Minimal in-memory rate limiter. Per warm server instance — enough to stop a
// single runaway client from draining the AI budget. Swap for a shared store
// (Redis/Upstash) if this ever runs at scale.

type Bucket = { hits: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return true;
  }
  b.hits += 1;
  return b.hits <= limit;
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}
