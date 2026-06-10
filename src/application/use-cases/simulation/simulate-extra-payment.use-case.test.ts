import { describe, expect, it, vi } from "vitest";

import type { FinancingDebt } from "@/domain/entities/debt.entity";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { simulateExtraPayment } from "./simulate-extra-payment.use-case";

function makeDebtRepo(): DebtRepositoryPort {
  return {
    findById: vi.fn(),
    listForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-19T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeMoney(value: number): Money {
  const r = Money.from(value);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeRate(annual: number): InterestRate {
  const r = InterestRate.fromAnnual(annual);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeFinancing(userId = "user-1"): FinancingDebt {
  const principal = makeMoney(10000);
  return {
    id: "debt-1",
    userId,
    label: "Casa",
    status: "active",
    originalPrincipal: principal,
    currentBalance: principal,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "financing",
    amortizationMethod: "PRICE",
    annualInterestRate: makeRate(0.12),
    termMonths: 24,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

describe("simulateExtraPayment", () => {
  it("returns equal baseline and withExtra when extra is zero", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeFinancing());

    const result = await simulateExtraPayment(
      { debts, clock },
      {
        userId: "user-1",
        debtId: "debt-1",
        monthlyPayment: makeMoney(500),
        extraPayment: makeMoney(0),
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.baseline.payoffMonth).toBe(result.value.withExtra.payoffMonth);
      expect(result.value.monthsSaved).toBe(0);
      expect(result.value.interestSaved.isZero()).toBe(true);
    }
  });

  it("returns positive monthsSaved and interestSaved when extra is positive", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeFinancing());

    const result = await simulateExtraPayment(
      { debts, clock },
      {
        userId: "user-1",
        debtId: "debt-1",
        monthlyPayment: makeMoney(500),
        extraPayment: makeMoney(200),
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.monthsSaved).toBeGreaterThan(0);
      expect(result.value.interestSaved.toNumber()).toBeGreaterThan(0);
      expect(result.value.withExtra.totalInterest.toNumber()).toBeLessThan(
        result.value.baseline.totalInterest.toNumber(),
      );
    }
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await simulateExtraPayment(
      { debts, clock },
      {
        userId: "user-1",
        debtId: "missing",
        monthlyPayment: makeMoney(500),
        extraPayment: makeMoney(100),
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
  });
});
