import { getSupabaseAdminClient } from "./supabase.server";
import { logger } from "./logger.server";

// Rate limit de login persistido no Supabase: em serverless (Vercel) cada
// instância tem memória própria, então a proteção contra força bruta precisa
// de um armazenamento compartilhado. Em erro de banco a checagem falha aberta
// (permite o login) para indisponibilidade transitória não travar o sistema.

const TABLE = "login_rate_limits";

type LoginRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  blockMs: number;
};

type StoredBucket = {
  count: number;
  window_started_at: string;
  blocked_until: string | null;
};

async function fetchBucket(key: string): Promise<StoredBucket | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("count, window_started_at, blocked_until")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StoredBucket | null) ?? null;
}

export async function inspectLoginRateLimit({ key }: Pick<LoginRateLimitOptions, "key">) {
  try {
    const bucket = await fetchBucket(key);
    if (!bucket?.blocked_until) return { allowed: true as const, retryAfterMs: 0 };
    const blockedUntil = new Date(bucket.blocked_until).getTime();
    const now = Date.now();
    if (blockedUntil > now) {
      return { allowed: false as const, retryAfterMs: blockedUntil - now };
    }
    return { allowed: true as const, retryAfterMs: 0 };
  } catch (error) {
    logger.warn("auth.rate_limit.inspect_failed", { error: String(error) });
    return { allowed: true as const, retryAfterMs: 0 };
  }
}

export async function recordLoginFailure({ key, limit, windowMs, blockMs }: LoginRateLimitOptions) {
  try {
    const supabase = getSupabaseAdminClient();
    const now = Date.now();
    const bucket = await fetchBucket(key);
    const windowExpired = !bucket || now - new Date(bucket.window_started_at).getTime() >= windowMs;

    if (windowExpired) {
      const { error } = await supabase.from(TABLE).upsert({
        key,
        count: 1,
        window_started_at: new Date(now).toISOString(),
        blocked_until: null,
        updated_at: new Date(now).toISOString(),
      });
      if (error) throw new Error(error.message);
      return { blocked: false as const, retryAfterMs: 0 };
    }

    const count = bucket.count + 1;
    const blocked = count > limit;
    const { error } = await supabase.from(TABLE).upsert({
      key,
      count,
      window_started_at: bucket.window_started_at,
      blocked_until: blocked ? new Date(now + blockMs).toISOString() : null,
      updated_at: new Date(now).toISOString(),
    });
    if (error) throw new Error(error.message);
    return blocked
      ? { blocked: true as const, retryAfterMs: blockMs }
      : { blocked: false as const, retryAfterMs: 0 };
  } catch (error) {
    logger.warn("auth.rate_limit.record_failed", { error: String(error) });
    return { blocked: false as const, retryAfterMs: 0 };
  }
}

export async function clearLoginRateLimit(key: string) {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from(TABLE).delete().eq("key", key);
    if (error) throw new Error(error.message);
  } catch (error) {
    logger.warn("auth.rate_limit.clear_failed", { error: String(error) });
  }
}
