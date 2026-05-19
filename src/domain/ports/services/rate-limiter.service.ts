export interface RateLimitWindow {
  window: string;
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimiter {
  check(key: string, opts: RateLimitWindow): Promise<RateLimitResult>;
}
