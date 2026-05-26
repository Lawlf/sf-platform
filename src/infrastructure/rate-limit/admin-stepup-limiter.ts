import { Ratelimit } from "@upstash/ratelimit";

import { getUpstashRedis } from "@/infrastructure/cache/upstash-redis";

let limiter: Ratelimit | null = null;

/** 5 attempts per 300 s per admin. Null when Upstash unset (fail-open). */
export function getAdminStepUpLimiter(): Ratelimit | null {
  try {
    if (!limiter) {
      limiter = new Ratelimit({
        redis: getUpstashRedis(),
        limiter: Ratelimit.slidingWindow(5, "300 s"),
        prefix: "rl:admin-stepup",
      });
    }
    return limiter;
  } catch {
    // Upstash not configured (dev) — fail open.
    return null;
  }
}
