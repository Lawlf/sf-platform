import { describe, expect, it } from "vitest";

import { FinancialIndependenceService } from "./financial-independence.service";

describe("FinancialIndependenceService.simulate", () => {
  it("computes the target as annual cost divided by the real return (perpetual withdrawal)", () => {
    const r = FinancialIndependenceService.simulate({
      currentInvestedCents: 0n,
      monthlyContributionCents: 1000_00n,
      monthlyCostOfLivingCents: 2000_00n,
      realAnnualReturnPct: 4,
    });
    // alvo = 2000 * 12 / 0.04 = 600.000 (regra dos 4%: 25x o custo anual)
    expect(Number(r.targetCents)).toBeCloseTo(600_000_00, -2);
    expect(r.alreadyFree).toBe(false);
    expect(r.monthsToFreedom).not.toBeNull();
  });

  it("flags alreadyFree when current wealth already covers the target", () => {
    const r = FinancialIndependenceService.simulate({
      currentInvestedCents: 600_000_00n,
      monthlyContributionCents: 1000_00n,
      monthlyCostOfLivingCents: 2000_00n,
      realAnnualReturnPct: 4,
    });
    expect(r.alreadyFree).toBe(true);
    expect(r.monthsToFreedom).toBe(0);
    expect(r.totalContributedCents).toBe(0n);
    expect(r.totalGrowthCents).toBe(0n);
  });

  it("reaches a small target in the expected number of months", () => {
    // alvo = 50 * 12 / 0.12 = 5.000; aporte R$ 1.000/mês, retorno 12% a.a.
    const r = FinancialIndependenceService.simulate({
      currentInvestedCents: 0n,
      monthlyContributionCents: 1000_00n,
      monthlyCostOfLivingCents: 50_00n,
      realAnnualReturnPct: 12,
    });
    expect(Number(r.targetCents)).toBeCloseTo(5_000_00, -2);
    expect(r.monthsToFreedom).toBe(5);
  });

  it("treats zero cost of living as already free (target zero)", () => {
    const r = FinancialIndependenceService.simulate({
      currentInvestedCents: 0n,
      monthlyContributionCents: 500_00n,
      monthlyCostOfLivingCents: 0n,
      realAnnualReturnPct: 4,
    });
    expect(r.targetCents).toBe(0n);
    expect(r.alreadyFree).toBe(true);
    expect(r.monthsToFreedom).toBe(0);
  });

  it("marks the scenario infeasible at 0% real return instead of inflating the target 1000x", () => {
    const r = FinancialIndependenceService.simulate({
      currentInvestedCents: 0n,
      monthlyContributionCents: 1000_00n,
      monthlyCostOfLivingCents: 5000_00n,
      realAnnualReturnPct: 0,
    });
    expect(r.feasible).toBe(false);
    expect(r.alreadyFree).toBe(false);
    expect(r.monthsToFreedom).toBeNull();
    // não pode devolver um alvo "real" derivado de um piso silencioso de 0,1%.
    expect(Number(r.targetCents)).toBeLessThan(60_000_000_00);
  });

  it("keeps positive real-return scenarios feasible", () => {
    const r = FinancialIndependenceService.simulate({
      currentInvestedCents: 0n,
      monthlyContributionCents: 1000_00n,
      monthlyCostOfLivingCents: 2000_00n,
      realAnnualReturnPct: 4,
    });
    expect(r.feasible).toBe(true);
  });

  it("returns null months when contributions and wealth cannot reach the target", () => {
    const r = FinancialIndependenceService.simulate({
      currentInvestedCents: 0n,
      monthlyContributionCents: 0n,
      monthlyCostOfLivingCents: 3000_00n,
      realAnnualReturnPct: 4,
    });
    expect(r.monthsToFreedom).toBeNull();
    expect(r.projectedCents).toBe(0n);
  });

  it("higher monthly contribution reaches freedom sooner", () => {
    const base = {
      currentInvestedCents: 50_000_00n,
      monthlyCostOfLivingCents: 4000_00n,
      realAnnualReturnPct: 4,
    };
    const low = FinancialIndependenceService.simulate({
      ...base,
      monthlyContributionCents: 1000_00n,
    });
    const high = FinancialIndependenceService.simulate({
      ...base,
      monthlyContributionCents: 3000_00n,
    });
    expect(low.monthsToFreedom).not.toBeNull();
    expect(high.monthsToFreedom).not.toBeNull();
    expect(high.monthsToFreedom!).toBeLessThan(low.monthsToFreedom!);
  });

  it("splits projected wealth into contributions and growth", () => {
    const r = FinancialIndependenceService.simulate({
      currentInvestedCents: 10_000_00n,
      monthlyContributionCents: 1000_00n,
      monthlyCostOfLivingCents: 1000_00n,
      realAnnualReturnPct: 6,
    });
    expect(r.monthsToFreedom).not.toBeNull();
    // projetado = patrimônio inicial + aportes + rendimento
    const sum = 10_000_00n + r.totalContributedCents + r.totalGrowthCents;
    expect(Number(sum)).toBeCloseTo(Number(r.projectedCents), -2);
    expect(r.totalGrowthCents > 0n).toBe(true);
  });
});
