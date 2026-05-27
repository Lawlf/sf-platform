import { describe, expect, it } from "vitest";

import { InvestmentGoalService } from "./investment-goal.service";

describe("InvestmentGoalService.compute", () => {
  it("with zero rate, splits the goal evenly across the months", () => {
    const r = InvestmentGoalService.compute({
      targetCents: 12_000_00n,
      initialCents: 0n,
      annualRatePct: 0,
      years: 1,
    });
    expect(Number(r.requiredMonthlyCents) / 100).toBeCloseTo(1000, 2);
    expect(Number(r.totalContributedCents) / 100).toBeCloseTo(12_000, 2);
    expect(Number(r.totalInterestCents) / 100).toBeCloseTo(0, 2);
  });

  it("flags alreadyReached when the initial amount grows past the goal", () => {
    const r = InvestmentGoalService.compute({
      targetCents: 1_000_00n,
      initialCents: 2_000_00n,
      annualRatePct: 10,
      years: 5,
    });
    expect(r.alreadyReached).toBe(true);
    expect(r.requiredMonthlyCents).toBe(0n);
  });

  it("a higher expected return lowers the required monthly contribution", () => {
    const base = { targetCents: 100_000_00n, initialCents: 10_000_00n, years: 10 };
    const low = InvestmentGoalService.compute({ ...base, annualRatePct: 4 });
    const high = InvestmentGoalService.compute({ ...base, annualRatePct: 12 });
    expect(high.requiredMonthlyCents < low.requiredMonthlyCents).toBe(true);
  });

  it("the goal equals initial + contributions + interest", () => {
    const target = 100_000_00n;
    const r = InvestmentGoalService.compute({
      targetCents: target,
      initialCents: 10_000_00n,
      annualRatePct: 10,
      years: 10,
    });
    const sum = 10_000_00n + r.totalContributedCents + r.totalInterestCents;
    expect(Number(sum)).toBeCloseTo(Number(target), -3);
    expect(r.totalInterestCents > 0n).toBe(true);
  });
});
