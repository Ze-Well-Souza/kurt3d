import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRateLimit,
  inspectRateLimit,
  recordRateLimitFailure,
  resetRateLimitBuckets,
} from "./rate-limit.server";

describe("rate-limit.server", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("bloqueia apos exceder o limite dentro da janela", () => {
    const options = { key: "login:ip:phone", limit: 2, windowMs: 60_000, blockMs: 120_000, nowMs: 1_000 };

    expect(recordRateLimitFailure(options)).toEqual({ blocked: false, retryAfterMs: 0 });
    expect(recordRateLimitFailure({ ...options, nowMs: 2_000 })).toEqual({ blocked: false, retryAfterMs: 0 });
    expect(recordRateLimitFailure({ ...options, nowMs: 3_000 })).toEqual({ blocked: true, retryAfterMs: 120_000 });
    expect(inspectRateLimit({ ...options, nowMs: 4_000 })).toEqual({ allowed: false, retryAfterMs: 119_000 });
  });

  it("limpa o bloqueio quando a autenticacao e bem-sucedida", () => {
    const options = { key: "login:ok", limit: 1, windowMs: 60_000, blockMs: 120_000, nowMs: 1_000 };

    recordRateLimitFailure(options);
    clearRateLimit(options.key);

    expect(inspectRateLimit({ ...options, nowMs: 2_000 })).toEqual({ allowed: true, retryAfterMs: 0 });
  });
});
