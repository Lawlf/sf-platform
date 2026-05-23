import {
  type DistributedLock,
  LockUnavailableError,
} from "@/domain/ports/services/distributed-lock.service";
import { getUpstashRedis } from "@/infrastructure/cache/upstash-redis";

const KEY_PREFIX = "sf_lock:";

export class UpstashDistributedLock implements DistributedLock {
  async run<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const redis = getUpstashRedis();
    const fullKey = KEY_PREFIX + key;
    const token = crypto.randomUUID();
    const acquired = await redis.set(fullKey, token, { px: ttlMs, nx: true });
    if (acquired !== "OK") {
      throw new LockUnavailableError(key);
    }
    try {
      return await fn();
    } finally {
      // Best-effort release — only if we still own the lock.
      try {
        const current = await redis.get<string>(fullKey);
        if (current === token) {
          await redis.del(fullKey);
        }
      } catch (e) {
        console.warn("[lock] release failed", {
          key,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }
}
