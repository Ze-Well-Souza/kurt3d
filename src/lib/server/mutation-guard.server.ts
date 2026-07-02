import { getRequest } from "@tanstack/react-start/server";
import { getClientIp, recordRateLimitFailure } from "./rate-limit.server";

const MUTATION_RATE_LIMIT = {
  limit: 60,
  windowMs: 60_000,
  blockMs: 60_000,
} as const;

/**
 * Rate-limit mutation server functions by client IP.
 * Throws "rate_limited" if the client exceeded the allowed number of mutations
 * within the sliding window.
 *
 * Must be called at the start of every mutation (POST) handler.
 */
export async function checkMutationRateLimit(): Promise<void> {
  const request = getRequest();
  const ip = getClientIp(request);
  const result = recordRateLimitFailure({
    key: `mutation:${ip}`,
    limit: MUTATION_RATE_LIMIT.limit,
    windowMs: MUTATION_RATE_LIMIT.windowMs,
    blockMs: MUTATION_RATE_LIMIT.blockMs,
  });
  if (result.blocked) {
    throw new Error("rate_limited");
  }
}
