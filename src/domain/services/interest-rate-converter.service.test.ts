import { describe, expect, it } from "vitest";

import { InterestRateConverterService } from "./interest-rate-converter.service";

describe("InterestRateConverterService.convert", () => {
  it("converts monthly to annual with compounding (1% a.m. = 12,68% a.a.)", () => {
    const r = InterestRateConverterService.convert({ ratePct: 1, from: "monthly" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.monthlyPct).toBeCloseTo(1, 6);
    expect(r.annualPct).toBeCloseTo(12.6825, 3);
  });

  it("converts annual to monthly with compounding (12% a.a. ~ 0,949% a.m.)", () => {
    const r = InterestRateConverterService.convert({ ratePct: 12, from: "annual" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.annualPct).toBeCloseTo(12, 6);
    expect(r.monthlyPct).toBeCloseTo(0.9489, 3);
  });

  it("fails for a rate at or below -100%", () => {
    const r = InterestRateConverterService.convert({ ratePct: -100, from: "monthly" });
    expect(r.ok).toBe(false);
  });
});
