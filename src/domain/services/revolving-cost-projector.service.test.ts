import { describe, expect, it } from "vitest";

import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors";

import { RevolvingCostProjectorService } from "./revolving-cost-projector.service";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture");
  return r.value;
}
function rateMonthly(n: number): InterestRate {
  const r = InterestRate.fromMonthly(n);
  if (!isOk(r)) throw new Error("rate");
  return r.value;
}

describe("RevolvingCostProjectorService", () => {
  it("R$ 1000 @ 10% a.m. by 12 months grows to ~R$ 3138", () => {
    const r = RevolvingCostProjectorService.project({
      currentBalance: moneyOf(1000),
      monthlyRate: rateMonthly(0.1),
      monthsAhead: 12,
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.monthlyBalances).toHaveLength(12);
      // textbook 1000 * 1.1^12 = 3138.43
      expect(Math.abs(r.value.totalAfter.toNumber() - 3138.43)).toBeLessThanOrEqual(0.05);
      expect(r.value.multiplier).toBeCloseTo(Math.pow(1.1, 12), 6);
    }
  });

  it("monthsAhead = 0 returns empty array, totalAfter = currentBalance, multiplier = 1", () => {
    const r = RevolvingCostProjectorService.project({
      currentBalance: moneyOf(500),
      monthlyRate: rateMonthly(0.05),
      monthsAhead: 0,
    });
    if (isOk(r)) {
      expect(r.value.monthlyBalances).toHaveLength(0);
      expect(r.value.totalAfter.toCents()).toBe(50000n);
      expect(r.value.multiplier).toBe(1);
    }
  });

  it("zero balance stays zero", () => {
    const r = RevolvingCostProjectorService.project({
      currentBalance: moneyOf(0),
      monthlyRate: rateMonthly(0.15),
      monthsAhead: 6,
    });
    if (isOk(r)) {
      for (const m of r.value.monthlyBalances) {
        expect(m.toCents()).toBe(0n);
      }
      expect(r.value.multiplier).toBe(1);
    }
  });

  it("zero rate keeps balance constant", () => {
    const r = RevolvingCostProjectorService.project({
      currentBalance: moneyOf(2000),
      monthlyRate: rateMonthly(0),
      monthsAhead: 5,
    });
    if (isOk(r)) {
      for (const m of r.value.monthlyBalances) {
        expect(m.toCents()).toBe(200000n);
      }
      expect(r.value.multiplier).toBe(1);
    }
  });

  it("negative monthsAhead returns Err", () => {
    expect(
      isErr(
        RevolvingCostProjectorService.project({
          currentBalance: moneyOf(100),
          monthlyRate: rateMonthly(0.05),
          monthsAhead: -1,
        }),
      ),
    ).toBe(true);
  });

  it("non-integer monthsAhead returns Err", () => {
    expect(
      isErr(
        RevolvingCostProjectorService.project({
          currentBalance: moneyOf(100),
          monthlyRate: rateMonthly(0.05),
          monthsAhead: 3.5,
        }),
      ),
    ).toBe(true);
  });
});
