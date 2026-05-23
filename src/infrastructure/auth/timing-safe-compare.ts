import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison. Returns false (no leak) when lengths
 * differ, which itself leaks length — acceptable for opaque secrets where
 * length is not sensitive (e.g., CRON_SECRET, API tokens).
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
