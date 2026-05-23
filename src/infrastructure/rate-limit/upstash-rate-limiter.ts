import { Ratelimit } from "@upstash/ratelimit";

import type {
  RateLimitResult,
  RateLimitWindow,
  RateLimiter,
} from "@/domain/ports/services/rate-limiter.service";
import { getUpstashRedis } from "@/infrastructure/cache/upstash-redis";

const limiterInstances = new Map<string, Ratelimit>();

function getLimiter(window: string, max: number): Ratelimit {
  const cacheKey = `${window}:${max}`;
  const cached = limiterInstances.get(cacheKey);
  if (cached) return cached;
  const fresh = new Ratelimit({
    redis: getUpstashRedis(),
    limiter: Ratelimit.tokenBucket(
      max,
      window as Parameters<typeof Ratelimit.tokenBucket>[1],
      max,
    ),
    analytics: false,
    prefix: "sf_rl",
  });
  limiterInstances.set(cacheKey, fresh);
  return fresh;
}

export class UpstashRateLimiter implements RateLimiter {
  async check(key: string, opts: RateLimitWindow): Promise<RateLimitResult> {
    try {
      const result = await getLimiter(opts.window, opts.max).limit(key);
      return {
        ok: result.success,
        remaining: result.remaining,
        resetAt: new Date(result.reset),
      };
    } catch (error) {
      console.warn("[rate-limit] upstash error, failing closed", {
        key,
        window: opts.window,
        max: opts.max,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, remaining: 0, resetAt: new Date(Date.now() + 60_000) };
    }
  }
}
