/**
 * Small in-process rate limiter.
 *
 * Adequate for a single-instance deployment and for the prototype; a
 * multi-instance production deployment should back the same interface with
 * Redis or the platform's edge rate limiter.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

// Keep the map from growing without bound on a long-running process.
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __mrRateLimitSweep?: boolean };
  if (!g.__mrRateLimitSweep) {
    g.__mrRateLimitSweep = true;
    setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt < now) buckets.delete(key);
      }
    }, 60_000).unref?.();
  }
}
