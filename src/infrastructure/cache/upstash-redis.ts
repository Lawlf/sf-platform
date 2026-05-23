import { Redis } from "@upstash/redis";

import { requireUpstashConfig } from "@/infrastructure/config/env";

let cached: Redis | null = null;

export function getUpstashRedis(): Redis {
  if (cached) return cached;
  const cfg = requireUpstashConfig();
  cached = new Redis({ url: cfg.url, token: cfg.token });
  return cached;
}
