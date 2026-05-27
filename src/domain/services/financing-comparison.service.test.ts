import { describe, expect, it } from "vitest";

import { FinancingComparisonService } from "./financing-comparison.service";

describe("FinancingComparisonService.compare", () => {
  it("with zero rate, both systems split the principal evenly with no interest", () => {
    const r = FinancingComparisonService.compare({
      principalCents: 1_200_00n,
      annualRatePct: 0,
      termMonths: 12,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Number(r.price.firstInstallmentCents)).toBe(100_00);
    expect(Number(r.price.lastInstallmentCents)).toBe(100_00);
    expect(Number(r.sac.firstInstallmentCents)).toBe(100_00);
    expect(Number(r.price.totalInterestCents)).toBe(0);
    expect(Number(r.sac.totalInterestCents)).toBe(0);
    expect(r.interestSavedBySacCents).toBe(0n);
  });

  it("Price keeps a flat installment; SAC starts higher and decreases", () => {
    const r = FinancingComparisonService.compare({
      principalCents: 100_000_00n,
      annualRatePct: 12,
      termMonths: 24,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Price: primeira ~ última (parcela fixa).
    expect(Number(r.price.lastInstallmentCents)).toBeCloseTo(
      Number(r.price.firstInstallmentCents),
      -2,
    );
    // SAC: decrescente.
    expect(r.sac.firstInstallmentCents > r.sac.lastInstallmentCents).toBe(true);
    // SAC paga menos juros que Price.
    expect(r.sac.totalInterestCents < r.price.totalInterestCents).toBe(true);
    expect(r.interestSavedBySacCents).toBe(
      r.price.totalInterestCents - r.sac.totalInterestCents,
    );
    // SAC começa com parcela mais alta que Price.
    expect(r.sac.firstInstallmentCents > r.price.firstInstallmentCents).toBe(true);
  });

  it("total paid exceeds the principal when there is interest", () => {
    const r = FinancingComparisonService.compare({
      principalCents: 50_000_00n,
      annualRatePct: 9,
      termMonths: 36,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.price.totalPaidCents > 50_000_00n).toBe(true);
    expect(r.sac.totalPaidCents > 50_000_00n).toBe(true);
    expect(r.sac.totalPaidCents < r.price.totalPaidCents).toBe(true);
  });

  it("fails gracefully for a non-positive principal", () => {
    const r = FinancingComparisonService.compare({
      principalCents: 0n,
      annualRatePct: 10,
      termMonths: 12,
    });
    expect(r.ok).toBe(false);
  });

  it("fails gracefully for an invalid term", () => {
    const r = FinancingComparisonService.compare({
      principalCents: 10_000_00n,
      annualRatePct: 10,
      termMonths: 0,
    });
    expect(r.ok).toBe(false);
  });
});
