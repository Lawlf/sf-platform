import { describe, expect, it } from "vitest";

import { CompoundGrowthService } from "./compound-growth.service";

describe("CompoundGrowthService.simulate", () => {
  it("returns zero for empty inputs", () => {
    const r = CompoundGrowthService.simulate({
      initialCents: 0n,
      monthlyContributionCents: 0n,
      annualRatePct: 10,
      years: 10,
    });
    expect(r.finalCents).toBe(0n);
    expect(r.totalInterestCents).toBe(0n);
  });

  it("with zero rate, final equals contributions plus initial (no interest)", () => {
    const r = CompoundGrowthService.simulate({
      initialCents: 1_000_00n,
      monthlyContributionCents: 100_00n,
      annualRatePct: 0,
      years: 1,
    });
    // 1.000 + 100 * 12 = 2.200
    expect(Number(r.finalCents)).toBeCloseTo(2_200_00, -2);
    expect(Number(r.totalContributedCents)).toBe(1_200_00);
    expect(Number(r.totalInterestCents)).toBeCloseTo(0, -2);
  });

  it("compounds an initial amount at the annual rate", () => {
    const r = CompoundGrowthService.simulate({
      initialCents: 10_000_00n,
      monthlyContributionCents: 0n,
      annualRatePct: 10,
      years: 1,
    });
    // composição mensal equivalente a 10% a.a. => 11.000 ao fim de 1 ano
    expect(Number(r.finalCents)).toBeCloseTo(11_000_00, -3);
    expect(Number(r.totalInterestCents)).toBeCloseTo(1_000_00, -3);
  });

  it("splits final wealth into invested principal and interest", () => {
    const r = CompoundGrowthService.simulate({
      initialCents: 5_000_00n,
      monthlyContributionCents: 500_00n,
      annualRatePct: 12,
      years: 5,
    });
    expect(Number(r.totalContributedCents)).toBe(500_00 * 60);
    expect(Number(r.totalInvestedCents)).toBe(5_000_00 + 500_00 * 60);
    const sum = r.totalInvestedCents + r.totalInterestCents;
    expect(Number(sum)).toBeCloseTo(Number(r.finalCents), -2);
    expect(r.totalInterestCents > 0n).toBe(true);
  });
});
