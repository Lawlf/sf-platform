import { Ratelimit } from "@upstash/ratelimit";

import { getUpstashRedis } from "@/infrastructure/cache/upstash-redis";

let limiter: Ratelimit | null = null;

/** ~1 ping / 25s per user (heartbeat is 30s; allow a small burst). Null when Upstash unset. */
export function getUsagePingLimiter(): Ratelimit | null {
  try {
    if (!limiter) {
      limiter = new Ratelimit({
        redis: getUpstashRedis(),
        limiter: Ratelimit.slidingWindow(5, "60 s"),
        prefix: "rl:usage-ping",
      });
    }
    return limiter;
  } catch {
    // Upstash not configured (dev) — fail open so pings still record locally.
    return null;
  }
}
