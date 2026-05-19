import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import type {
  RateLimitResult,
  RateLimitWindow,
  RateLimiter,
} from "@/domain/ports/services/rate-limiter.service";
import { requireUpstashConfig } from "@/infrastructure/config/env";

const redisInstances = new Map<string, Redis>();
const limiterInstances = new Map<string, Ratelimit>();

function getRedis(): Redis {
  const cfg = requireUpstashConfig();
  const cacheKey = `${cfg.url}:${cfg.token}`;
  const cached = redisInstances.get(cacheKey);
  if (cached) return cached;
  const fresh = new Redis({ url: cfg.url, token: cfg.token });
  redisInstances.set(cacheKey, fresh);
  return fresh;
}

function getLimiter(window: string, max: number): Ratelimit {
  const cacheKey = `${window}:${max}`;
  const cached = limiterInstances.get(cacheKey);
  if (cached) return cached;
  const fresh = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(max, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    analytics: false,
    prefix: "sf_rl",
  });
  limiterInstances.set(cacheKey, fresh);
  return fresh;
}

export class UpstashRateLimiter implements RateLimiter {
  async check(key: string, opts: RateLimitWindow): Promise<RateLimitResult> {
    const result = await getLimiter(opts.window, opts.max).limit(key);
    return {
      ok: result.success,
      remaining: result.remaining,
      resetAt: new Date(result.reset),
    };
  }
}
