import { describe, expect, it } from "vitest";

import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { PriceAmortizationService } from "./price-amortization.service";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture money parse failed");
  return r.value;
}

function rateAnnual(n: number): InterestRate {
  const r = InterestRate.fromAnnual(n);
  if (!isOk(r)) throw new Error("fixture rate failed");
  return r.value;
}

describe("PriceAmortizationService", () => {
  it("200k @ 10%aa (effective), 360m => first installment ~ R$ 1691.78", () => {
    // Note: codebase treats annual rate as effective; toMonthly() uses
    // (1 + i_a)^(1/12) - 1, not the nominal i_a / 12 convention.
    const r = PriceAmortizationService.generate({
      principal: moneyOf(200_000),
      annualRate: rateAnnual(0.1),
      termMonths: 360,
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      const first = r.value.installmentAt(1);
      expect(first).not.toBeNull();
      // Allow +/- R$ 0.05 vs analytical PMT
      expect(Math.abs(first!.installment.toNumber() - 1691.78)).toBeLessThanOrEqual(0.05);
      // total paid approx 609,041.39 (within R$ 1)
      expect(Math.abs(r.value.totalPaid().toNumber() - 609_041.39)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.value.totalInterest().toNumber() - 409_041.39)).toBeLessThanOrEqual(1);
      expect(r.value.installmentAt(360)!.remainingBalance.toNumber()).toBeCloseTo(0, 2);
    }
  });

  it("12k @ 12%aa (effective), 12m => first installment ~ R$ 1062.74", () => {
    const r = PriceAmortizationService.generate({
      principal: moneyOf(12_000),
      annualRate: rateAnnual(0.12),
      termMonths: 12,
    });
    if (isOk(r)) {
      const first = r.value.installmentAt(1);
      expect(Math.abs(first!.installment.toNumber() - 1062.74)).toBeLessThanOrEqual(0.05);
    }
  });

  it("zero rate => installments equal P/n exactly", () => {
    const r = PriceAmortizationService.generate({
      principal: moneyOf(1200),
      annualRate: rateAnnual(0),
      termMonths: 12,
    });
    if (isOk(r)) {
      expect(r.value.installmentAt(1)!.installment.toCents()).toBe(10000n);
      expect(r.value.totalPaid().toCents()).toBe(120000n);
      expect(r.value.totalInterest().toCents()).toBe(0n);
    }
  });

  it("n=1 => single installment = principal + 1 month interest", () => {
    const r = PriceAmortizationService.generate({
      principal: moneyOf(1000),
      annualRate: rateAnnual(0.12),
      termMonths: 1,
    });
    if (isOk(r)) {
      const monthlyRate = Math.pow(1.12, 1 / 12) - 1;
      const expected = 1000 + 1000 * monthlyRate;
      expect(
        Math.abs(r.value.installmentAt(1)!.installment.toNumber() - expected),
      ).toBeLessThanOrEqual(0.05);
      expect(r.value.installmentAt(1)!.remainingBalance.toCents()).toBe(0n);
    }
  });

  it("termMonths < 1 returns Err", () => {
    expect(
      isErr(
        PriceAmortizationService.generate({
          principal: moneyOf(1000),
          annualRate: rateAnnual(0.1),
          termMonths: 0,
        }),
      ),
    ).toBe(true);
  });

  it("non-integer termMonths returns Err", () => {
    expect(
      isErr(
        PriceAmortizationService.generate({
          principal: moneyOf(1000),
          annualRate: rateAnnual(0.1),
          termMonths: 12.5,
        }),
      ),
    ).toBe(true);
  });

  it("principal <= 0 returns Err", () => {
    expect(
      isErr(
        PriceAmortizationService.generate({
          principal: moneyOf(0),
          annualRate: rateAnnual(0.1),
          termMonths: 12,
        }),
      ),
    ).toBe(true);
  });

  it("schedule reconciles invariants (final balance ~0, principal sum ~P)", () => {
    const r = PriceAmortizationService.generate({
      principal: moneyOf(50_000),
      annualRate: rateAnnual(0.08),
      termMonths: 60,
    });
    if (isOk(r)) {
      // Compare in cents to avoid float epsilon; schedule allows +/- 1 cent drift.
      const diffCents = r.value.totalPrincipal().toCents() - 5_000_000n;
      expect(diffCents <= 1n && diffCents >= -1n).toBe(true);
      expect(r.value.installmentAt(60)!.remainingBalance.toCents()).toBe(0n);
    }
  });
});
