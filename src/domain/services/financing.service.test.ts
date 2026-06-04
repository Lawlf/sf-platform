import { describe, expect, it } from "vitest";

import { FinancingService } from "./financing.service";

describe("FinancingService.simulate", () => {
  it("with zero rate, Price splits the principal evenly with no interest", () => {
    const r = FinancingService.simulate({
      loanAmountCents: 1_200_00n,
      annualRatePct: 0,
      months: 12,
      method: "price",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Number(r.firstInstallmentCents)).toBe(100_00);
    expect(Number(r.lastInstallmentCents)).toBe(100_00);
    expect(Number(r.totalInterestCents)).toBe(0);
    expect(Number(r.totalPaidCents)).toBe(1_200_00);
  });

  it("Price keeps a flat installment when there is interest", () => {
    const r = FinancingService.simulate({
      loanAmountCents: 100_000_00n,
      annualRatePct: 12,
      months: 24,
      method: "price",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Number(r.lastInstallmentCents)).toBeCloseTo(Number(r.firstInstallmentCents), -2);
    expect(r.totalInterestCents > 0n).toBe(true);
    expect(r.totalPaidCents > 100_000_00n).toBe(true);
  });

  it("SAC starts higher and decreases, paying less interest than Price", () => {
    const price = FinancingService.simulate({
      loanAmountCents: 100_000_00n,
      annualRatePct: 12,
      months: 24,
      method: "price",
    });
    const sac = FinancingService.simulate({
      loanAmountCents: 100_000_00n,
      annualRatePct: 12,
      months: 24,
      method: "sac",
    });
    expect(price.ok && sac.ok).toBe(true);
    if (!price.ok || !sac.ok) return;
    expect(sac.firstInstallmentCents > sac.lastInstallmentCents).toBe(true);
    expect(sac.firstInstallmentCents > price.firstInstallmentCents).toBe(true);
    expect(sac.totalInterestCents < price.totalInterestCents).toBe(true);
  });

  it("fails gracefully for a non-positive principal", () => {
    const r = FinancingService.simulate({
      loanAmountCents: 0n,
      annualRatePct: 10,
      months: 12,
      method: "price",
    });
    expect(r.ok).toBe(false);
  });

  it("fails gracefully for an invalid term", () => {
    const r = FinancingService.simulate({
      loanAmountCents: 10_000_00n,
      annualRatePct: 10,
      months: 0,
      method: "sac",
    });
    expect(r.ok).toBe(false);
  });
});
