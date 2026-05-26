import { describe, expect, it } from "vitest";

import { monthlyCentsFor } from "./mrr";

describe("monthlyCentsFor", () => {
  it("returns the price as-is for monthly", () => {
    expect(monthlyCentsFor("month", 2990n)).toBe(2990n);
  });

  it("divides yearly price by 12 (floored)", () => {
    expect(monthlyCentsFor("year", 29900n)).toBe(2491n);
  });

  it("returns 0 for lifetime (not recurring revenue)", () => {
    expect(monthlyCentsFor("lifetime", 49900n)).toBe(0n);
  });
});
