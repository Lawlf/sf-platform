import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { SystemClock } from "./system-clock";

describe("SystemClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current Date", () => {
    const clock = new SystemClock();
    expect(clock.now().toISOString()).toBe("2030-01-15T12:00:00.000Z");
  });

  it("advances when time advances", () => {
    const clock = new SystemClock();
    const first = clock.now();
    vi.advanceTimersByTime(60_000);
    const second = clock.now();
    expect(second.getTime() - first.getTime()).toBe(60_000);
  });
});
