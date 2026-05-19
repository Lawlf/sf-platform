import { describe, expect, it } from "vitest";

import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors";

import { PriceAmortizationService } from "./amortization/price-amortization.service";
import { CetCalculatorService } from "./cet-calculator.service";

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

describe("CetCalculatorService", () => {
  it("zero-fee Price loan recovers the input monthly rate (CET ~= informed)", () => {
    const params = {
      principal: moneyOf(100_000),
      annualRate: rateAnnual(0.12),
      termMonths: 60,
    };
    const schedule = PriceAmortizationService.generate(params);
    if (!isOk(schedule)) throw new Error("schedule failed");
    const installments = schedule.value.installments.map((row) => row.installment);
    const cet = CetCalculatorService.compute({
      principal: params.principal,
      installments,
    });
    expect(isOk(cet)).toBe(true);
    if (isOk(cet)) {
      const expectedMonthly = params.annualRate.toMonthly().toDecimal();
      expect(cet.value.toDecimal()).toBeCloseTo(expectedMonthly, 6);
    }
  });

  it("upfront fees push CET above the nominal rate", () => {
    const params = {
      principal: moneyOf(10_000),
      annualRate: rateAnnual(0.12),
      termMonths: 24,
    };
    const schedule = PriceAmortizationService.generate(params);
    if (!isOk(schedule)) throw new Error("schedule failed");
    const installments = schedule.value.installments.map((row) => row.installment);
    const nominalMonthly = params.annualRate.toMonthly().toDecimal();

    const noFee = CetCalculatorService.compute({
      principal: params.principal,
      installments,
    });
    const withFee = CetCalculatorService.compute({
      principal: params.principal,
      installments,
      upfrontFees: moneyOf(1000),
    });
    if (isOk(noFee) && isOk(withFee)) {
      // Cent-level rounding in the 24-installment schedule introduces ~1e-6
      // drift between the nominal monthly rate and the IRR of the rounded
      // cash flow. Precision 5 (i.e., |diff| < 5e-6) absorbs that quantization.
      expect(noFee.value.toDecimal()).toBeCloseTo(nominalMonthly, 5);
      expect(withFee.value.toDecimal()).toBeGreaterThan(nominalMonthly);
    }
  });

  it("single payment of principal*(1+r) recovers r", () => {
    // P = 1000, n = 1, installment = 1000 * 1.05 = 1050 -> r = 0.05
    const cet = CetCalculatorService.compute({
      principal: moneyOf(1000),
      installments: [moneyOf(1050)],
    });
    if (isOk(cet)) {
      expect(cet.value.toDecimal()).toBeCloseTo(0.05, 8);
    }
  });

  it("empty installments returns Err", () => {
    expect(
      isErr(
        CetCalculatorService.compute({
          principal: moneyOf(1000),
          installments: [],
        }),
      ),
    ).toBe(true);
  });

  it("non-positive principal returns Err", () => {
    expect(
      isErr(
        CetCalculatorService.compute({
          principal: moneyOf(0),
          installments: [moneyOf(100)],
        }),
      ),
    ).toBe(true);
  });

  it("upfront fees >= principal returns Err (net <= 0)", () => {
    expect(
      isErr(
        CetCalculatorService.compute({
          principal: moneyOf(1000),
          installments: [moneyOf(100)],
          upfrontFees: moneyOf(1000),
        }),
      ),
    ).toBe(true);
  });

  it("negative installment value returns Err", () => {
    expect(
      isErr(
        CetCalculatorService.compute({
          principal: moneyOf(1000),
          installments: [moneyOf(-100)],
        }),
      ),
    ).toBe(true);
  });

  it("textbook: P=10_000, 12 x R$ 1.000 -> CET monthly approx 2.92% a.m.", () => {
    // 12 equal installments of 1000 against 10_000 principal.
    // IRR is around 2.9229%/m (textbook).
    const installments = Array.from({ length: 12 }, () => moneyOf(1000));
    const cet = CetCalculatorService.compute({
      principal: moneyOf(10_000),
      installments,
    });
    if (isOk(cet)) {
      expect(cet.value.toDecimal()).toBeCloseTo(0.029229, 4);
    }
  });
});
