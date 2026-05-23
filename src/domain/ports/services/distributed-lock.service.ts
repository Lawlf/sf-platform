/**
 * Distributed lock primitive used by use cases that must serialize concurrent
 * writes against the same logical resource (e.g., two simultaneous payment
 * recordings on the same debt). Implementations should be best-effort; if the
 * lock backend is unreachable the wrapped operation MUST NOT silently proceed.
 */
export interface DistributedLock {
  /**
   * Acquire `key` for at most `ttlMs` and run `fn`. Returns the function's
   * result on success. Throws `LockUnavailableError` if the lock cannot be
   * acquired within the wait budget (typically near-instant — these locks
   * are short-lived).
   */
  run<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}

export class LockUnavailableError extends Error {
  readonly code = "LOCK_UNAVAILABLE" as const;
  constructor(key: string) {
    super(`Resource is busy, try again: ${key}`);
    this.name = "LockUnavailableError";
  }
}
