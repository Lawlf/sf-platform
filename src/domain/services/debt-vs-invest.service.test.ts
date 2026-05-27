import { describe, expect, it } from "vitest";

import { DebtVsInvestService } from "./debt-vs-invest.service";

describe("DebtVsInvestService.simulate", () => {
  it("recommends quitar when the debt costs more than the investment yields", () => {
    const r = DebtVsInvestService.simulate({
      amountCents: 10_000_00n,
      debtAnnualRatePct: 20,
      investAnnualRatePct: 10,
      monthsHorizon: 12,
    });
    // juros evitados na dívida: 10.000 * 0,20 = 2.000
    expect(Number(r.debtInterestSavedCents)).toBeCloseTo(2_000_00, -2);
    // rendimento do investimento: 10.000 * 0,10 = 1.000
    expect(Number(r.investEarnedCents)).toBeCloseTo(1_000_00, -2);
    expect(r.recommendation).toBe("quitar");
    expect(Number(r.advantageCents)).toBeCloseTo(1_000_00, -2);
  });

  it("recommends investir when the investment yields more than the debt costs", () => {
    const r = DebtVsInvestService.simulate({
      amountCents: 5_000_00n,
      debtAnnualRatePct: 8,
      investAnnualRatePct: 13,
      monthsHorizon: 24,
    });
    expect(r.recommendation).toBe("investir");
    expect(r.investEarnedCents > r.debtInterestSavedCents).toBe(true);
  });

  it("returns empate when both rates are equal", () => {
    const r = DebtVsInvestService.simulate({
      amountCents: 3_000_00n,
      debtAnnualRatePct: 11,
      investAnnualRatePct: 11,
      monthsHorizon: 12,
    });
    expect(r.recommendation).toBe("empate");
    expect(r.advantageCents).toBe(0n);
  });

  it("keeps the rate-based recommendation even when the amount is zero", () => {
    const r = DebtVsInvestService.simulate({
      amountCents: 0n,
      debtAnnualRatePct: 18,
      investAnnualRatePct: 10,
      monthsHorizon: 12,
    });
    expect(r.recommendation).toBe("quitar");
    expect(r.debtInterestSavedCents).toBe(0n);
    expect(r.investEarnedCents).toBe(0n);
    expect(r.advantageCents).toBe(0n);
  });

  it("compounds over multi-year horizons", () => {
    const r = DebtVsInvestService.simulate({
      amountCents: 10_000_00n,
      debtAnnualRatePct: 10,
      investAnnualRatePct: 10,
      monthsHorizon: 24,
    });
    // 10.000 * (1,10^2 - 1) = 10.000 * 0,21 = 2.100
    expect(Number(r.debtInterestSavedCents)).toBeCloseTo(2_100_00, -2);
  });
});
