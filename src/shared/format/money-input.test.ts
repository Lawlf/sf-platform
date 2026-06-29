import { describe, expect, it } from "vitest";

import { applyCentsKey, coerceToCents, MAX_CENTS, parseCentsFromString } from "./money-input";

describe("applyCentsKey", () => {
  it("appends a digit by shifting left and adding", () => {
    expect(applyCentsKey(12n, "3")).toEqual({ kind: "commit", cents: 123n });
  });
  it("starts from zero", () => {
    expect(applyCentsKey(0n, "5")).toEqual({ kind: "commit", cents: 5n });
  });
  it("Backspace divides by ten (drops last digit)", () => {
    expect(applyCentsKey(123n, "Backspace")).toEqual({ kind: "commit", cents: 12n });
  });
  it("Backspace at single digit goes to zero", () => {
    expect(applyCentsKey(5n, "Backspace")).toEqual({ kind: "commit", cents: 0n });
  });
  it("Delete clears to zero", () => {
    expect(applyCentsKey(999n, "Delete")).toEqual({ kind: "commit", cents: 0n });
  });
  it("blocks a digit that would overflow MAX_CENTS", () => {
    expect(applyCentsKey(MAX_CENTS, "9")).toEqual({ kind: "block" });
  });
  it("ignores navigation keys so the browser default runs", () => {
    for (const key of ["Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"]) {
      expect(applyCentsKey(10n, key)).toEqual({ kind: "ignore" });
    }
  });
  it("blocks any other printable key", () => {
    expect(applyCentsKey(10n, "a")).toEqual({ kind: "block" });
    expect(applyCentsKey(10n, ".")).toEqual({ kind: "block" });
  });
});

describe("parseCentsFromString", () => {
  it("strips non-digits and parses", () => {
    expect(parseCentsFromString("R$ 1.234,56")).toBe(123456n);
  });
  it("empty (or all non-digit) becomes zero", () => {
    expect(parseCentsFromString("")).toBe(0n);
    expect(parseCentsFromString("R$ ,")).toBe(0n);
  });
  it("rejects overflow with null (caller keeps current value)", () => {
    expect(parseCentsFromString("9999999999999")).toBeNull();
  });
});

describe("coerceToCents", () => {
  it("passes bigint through", () => {
    expect(coerceToCents(123n)).toBe(123n);
  });
  it("rounds a finite number", () => {
    expect(coerceToCents(100.6)).toBe(101n);
  });
  it("parses a numeric string", () => {
    expect(coerceToCents("250")).toBe(250n);
  });
  it("falls back to zero for junk", () => {
    expect(coerceToCents("abc")).toBe(0n);
    expect(coerceToCents(undefined)).toBe(0n);
    expect(coerceToCents(Number.NaN)).toBe(0n);
  });
});
