import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    limit = limitMock;
  }
  (
    Ratelimit as unknown as {
      tokenBucket: (refill: number, window: string, max: number) => unknown;
    }
  ).tokenBucket = vi.fn().mockReturnValue({ kind: "tokenBucket" });
  return { Ratelimit };
});

describe("UpstashRateLimiter", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://x.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tk");
    vi.stubEnv("DATABASE_URL", "postgres://u:p@h:5432/db");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("SESSION_COOKIE_SECRET", "a".repeat(32));
    limitMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps success to ok=true", async () => {
    limitMock.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 60_000 });
    const { UpstashRateLimiter } = await import("./upstash-rate-limiter");
    const rl = new UpstashRateLimiter();
    const r = await rl.check("user:abc", { window: "1 h", max: 5 });
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(4);
    expect(r.resetAt).toBeInstanceOf(Date);
    expect(limitMock).toHaveBeenCalledWith("user:abc");
  });

  it("maps failure to ok=false", async () => {
    limitMock.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 30_000 });
    const { UpstashRateLimiter } = await import("./upstash-rate-limiter");
    const rl = new UpstashRateLimiter();
    const r = await rl.check("user:abc", { window: "1 h", max: 5 });
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("fails closed when upstash throws", async () => {
    limitMock.mockRejectedValue(new Error("upstash down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { UpstashRateLimiter } = await import("./upstash-rate-limiter");
    const rl = new UpstashRateLimiter();
    const r = await rl.check("user:abc", { window: "1 h", max: 5 });
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
