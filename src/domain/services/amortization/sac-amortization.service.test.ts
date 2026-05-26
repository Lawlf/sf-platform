import { describe, expect, it } from "vitest";

import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { PriceAmortizationService } from "./price-amortization.service";
import { SacAmortizationService } from "./sac-amortization.service";

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

describe("SacAmortizationService", () => {
  it("120k @ 12%aa, 120m => month 1 installment > month 120", () => {
    const r = SacAmortizationService.generate({
      principal: moneyOf(120_000),
      annualRate: rateAnnual(0.12),
      termMonths: 120,
    });
    if (isOk(r)) {
      const first = r.value.installmentAt(1)!;
      const last = r.value.installmentAt(120)!;
      expect(first.installment.compare(last.installment)).toBe(1);
    }
  });

  it("constant amortization across months", () => {
    const r = SacAmortizationService.generate({
      principal: moneyOf(12_000),
      annualRate: rateAnnual(0.12),
      termMonths: 12,
    });
    if (isOk(r)) {
      const baseAmortCents = r.value.installmentAt(1)!.principal.toCents();
      // months 2..(n-1) should match month 1 exactly (the last may differ by rounding)
      for (let m = 2; m < r.value.termMonths(); m++) {
        expect(r.value.installmentAt(m)!.principal.toCents()).toBe(baseAmortCents);
      }
      // last month within 1 cent of base
      const diff =
        r.value.installmentAt(r.value.termMonths())!.principal.toCents() - baseAmortCents;
      expect(diff <= 1n && diff >= -1n).toBe(true);
    }
  });

  it("sum of principal portions reconciles with original principal", () => {
    const r = SacAmortizationService.generate({
      principal: moneyOf(50_000),
      annualRate: rateAnnual(0.08),
      termMonths: 60,
    });
    if (isOk(r)) {
      // Compare in cents; schedule allows +/- 1 cent rounding drift.
      const diffCents = r.value.totalPrincipal().toCents() - 5_000_000n;
      expect(diffCents <= 1n && diffCents >= -1n).toBe(true);
    }
  });

  it("SAC total paid <= Price total paid for same parameters", () => {
    const params = {
      principal: moneyOf(100_000),
      annualRate: rateAnnual(0.1),
      termMonths: 120,
    };
    const sac = SacAmortizationService.generate(params);
    const price = PriceAmortizationService.generate(params);
    if (isOk(sac) && isOk(price)) {
      expect(sac.value.totalPaid().compare(price.value.totalPaid())).not.toBe(1);
      // strict inequality at non-zero rate
      expect(sac.value.totalPaid().compare(price.value.totalPaid())).toBe(-1);
    }
  });

  it("zero rate => every installment equals P/n", () => {
    const r = SacAmortizationService.generate({
      principal: moneyOf(1200),
      annualRate: rateAnnual(0),
      termMonths: 12,
    });
    if (isOk(r)) {
      for (let m = 1; m <= 12; m++) {
        expect(r.value.installmentAt(m)!.installment.toCents()).toBe(10000n);
      }
    }
  });

  it("rejects invalid params", () => {
    expect(
      isErr(
        SacAmortizationService.generate({
          principal: moneyOf(0),
          annualRate: rateAnnual(0.1),
          termMonths: 12,
        }),
      ),
    ).toBe(true);
    expect(
      isErr(
        SacAmortizationService.generate({
          principal: moneyOf(1000),
          annualRate: rateAnnual(0.1),
          termMonths: 0,
        }),
      ),
    ).toBe(true);
  });
});
