import { describe, expect, it } from "vitest";

import { todayIso, todayIsoUtc, toIsoDate } from "./dates";

describe("todayIso", () => {
  it("returns the local calendar date as yyyy-mm-dd", () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(todayIso()).toBe(expected);
  });
  it("matches the yyyy-mm-dd shape", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("todayIsoUtc", () => {
  it("returns the UTC calendar date as yyyy-mm-dd", () => {
    expect(todayIsoUtc()).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe("toIsoDate", () => {
  it("formats a Date as its UTC yyyy-mm-dd", () => {
    expect(toIsoDate(new Date("2026-06-15T12:00:00Z"))).toBe("2026-06-15");
  });
});
