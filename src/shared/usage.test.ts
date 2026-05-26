import { describe, expect, it } from "vitest";

import { cappedActiveSeconds, dayKeyUTC, HEARTBEAT_INTERVAL_SECONDS, windowStartDayUTC } from "./usage";

describe("usage helpers", () => {
  it("HEARTBEAT_INTERVAL_SECONDS is 30", () => {
    expect(HEARTBEAT_INTERVAL_SECONDS).toBe(30);
  });

  it("dayKeyUTC formats YYYY-MM-DD in UTC", () => {
    expect(dayKeyUTC(new Date("2026-05-23T23:30:00Z"))).toBe("2026-05-23");
  });

  it("windowStartDayUTC subtracts (days-1) and returns a day key", () => {
    expect(windowStartDayUTC(new Date("2026-05-23T10:00:00Z"), 7)).toBe("2026-05-17");
  });

  it("cappedActiveSeconds never exceeds one day", () => {
    expect(cappedActiveSeconds(86390, 30)).toBe(86400);
    expect(cappedActiveSeconds(100, 30)).toBe(130);
  });
});
