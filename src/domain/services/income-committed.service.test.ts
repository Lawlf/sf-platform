import { describe, expect, it } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors";

import { IncomeCommittedService } from "./income-committed.service";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture");
  return r.value;
}

describe("IncomeCommittedService", () => {
  it("R$ 5000 income, R$ 1500 debt = 0.30", () => {
    expect(
      IncomeCommittedService.compute({
        totalMonthlyIncome: moneyOf(5000),
        totalMonthlyDebtService: moneyOf(1500),
      }),
    ).toBeCloseTo(0.3, 6);
  });

  it("zero income with debt -> Infinity", () => {
    expect(
      IncomeCommittedService.compute({
        totalMonthlyIncome: moneyOf(0),
        totalMonthlyDebtService: moneyOf(100),
      }),
    ).toBe(Number.POSITIVE_INFINITY);
  });

  it("zero income, zero debt -> 0", () => {
    expect(
      IncomeCommittedService.compute({
        totalMonthlyIncome: moneyOf(0),
        totalMonthlyDebtService: moneyOf(0),
      }),
    ).toBe(0);
  });

  it("debt > income -> > 1", () => {
    expect(
      IncomeCommittedService.compute({
        totalMonthlyIncome: moneyOf(2000),
        totalMonthlyDebtService: moneyOf(2500),
      }),
    ).toBeCloseTo(1.25, 6);
  });
});
