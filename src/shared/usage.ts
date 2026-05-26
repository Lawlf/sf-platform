export const HEARTBEAT_INTERVAL_SECONDS = 30;
const SECONDS_PER_DAY = 86400;

/** UTC calendar day as "YYYY-MM-DD". */
export function dayKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Day key for the start of an N-day inclusive window ending today (UTC). */
export function windowStartDayUTC(now: Date, days: number): string {
  const midnight = new Date(dayKeyUTC(now) + "T00:00:00Z");
  const start = new Date(midnight.getTime() - (days - 1) * 86400 * 1000);
  return dayKeyUTC(start);
}

/** Adds an interval to a day's active seconds, capped at 24h. */
export function cappedActiveSeconds(current: number, interval: number): number {
  return Math.min(current + interval, SECONDS_PER_DAY);
}
