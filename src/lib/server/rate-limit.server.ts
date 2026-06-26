type RateLimitBucket = {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  blockMs: number;
  nowMs?: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function getClientIp(request?: Request | null) {
  if (!request) return "unknown";
  const forwarded = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip");

  if (forwarded) return forwarded.split(",")[0].trim();

  try {
    return new URL(request.url).hostname;
  } catch {
    return "unknown";
  }
}

export function inspectRateLimit({
  key,
  limit,
  windowMs,
  blockMs,
  nowMs = Date.now(),
}: RateLimitOptions) {
  const current = buckets.get(key);
  if (!current) return { allowed: true as const, retryAfterMs: 0 };

  if (current.blockedUntil > nowMs) {
    return { allowed: false as const, retryAfterMs: current.blockedUntil - nowMs };
  }

  if (nowMs - current.windowStartedAt >= windowMs) {
    buckets.delete(key);
    return { allowed: true as const, retryAfterMs: 0 };
  }

  return { allowed: true as const, retryAfterMs: 0 };
}

export function recordRateLimitFailure({
  key,
  limit,
  windowMs,
  blockMs,
  nowMs = Date.now(),
}: RateLimitOptions) {
  const current = buckets.get(key);

  if (!current || nowMs - current.windowStartedAt >= windowMs) {
    buckets.set(key, {
      count: 1,
      windowStartedAt: nowMs,
      blockedUntil: 0,
    });
    return { blocked: false as const, retryAfterMs: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    current.blockedUntil = nowMs + blockMs;
    return { blocked: true as const, retryAfterMs: blockMs };
  }

  buckets.set(key, current);
  return { blocked: false as const, retryAfterMs: 0 };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

export function resetRateLimitBuckets() {
  buckets.clear();
}
