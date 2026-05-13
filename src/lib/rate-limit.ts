// src/lib/rate-limit.ts
//
// In-memory sliding-window rate limiter.
// ⚠️  Single-instance only. For multi-instance production deployments,
//      replace the Map with Redis INCR + EXPIRE (REDIS_URL is already in .env).

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Clean up expired buckets every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    Array.from(store.entries()).forEach(([key, bucket]) => {
      if (bucket.resetAt < now) store.delete(key);
    });
  }, 5 * 60 * 1000);
}

/**
 * Returns true if the request is allowed, false if the rate limit is exceeded.
 * @param key      Unique key — typically `userId:endpoint`
 * @param limit    Max requests per window (default: 10)
 * @param windowMs Window duration in ms (default: 60 000 = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count++;
  return true;
}
