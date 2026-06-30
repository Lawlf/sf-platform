import { describe, expect, it } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { payrollLoanCurrentBalance } from "./payroll-loan.service";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fx");
  return r.value;
}

describe("payrollLoanCurrentBalance", () => {
  const debt = {
    monthlyInstallment: moneyOf(2_430),
    termMonths: 24,
    startDate: new Date("2026-01-15"),
  };

  it("elapsed 0 months -> full balance (24 * 2430)", () => {
    const balance = payrollLoanCurrentBalance(debt, new Date("2026-01-20"));
    expect(balance.toCents()).toBe(5_832_000n);
  });

  it("elapsed 6 months -> remaining 18 installments", () => {
    const balance = payrollLoanCurrentBalance(debt, new Date("2026-07-20"));
    expect(balance.toCents()).toBe(4_374_000n);
  });

  it("elapsed beyond term -> balance never negative, clamps to zero", () => {
    const balance = payrollLoanCurrentBalance(debt, new Date("2030-01-20"));
    expect(balance.toCents()).toBe(0n);
  });
});
