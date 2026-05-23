import { describe, expect, it, vi } from "vitest";

import type { FinancingDebt } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors";

import { projectDebtPayoff } from "./project-debt-payoff.use-case";

function makeDebtRepo(): DebtRepository {
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

describe("projectDebtPayoff", () => {
  it("delegates to DebtPayoffProjectorService on happy path", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    const debt = makeFinancing();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(debt);

    const result = await projectDebtPayoff(
      { debts, clock },
      {
        userId: "user-1",
        debtId: "debt-1",
        monthlyPayment: makeMoney(500),
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.payoffMonth).not.toBeNull();
      expect(result.value.monthlySchedule.length).toBeGreaterThan(0);
      expect(result.value.totalPaid.toNumber()).toBeGreaterThan(0);
    }
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await projectDebtPayoff(
      { debts, clock },
      {
        userId: "user-1",
        debtId: "missing",
        monthlyPayment: makeMoney(500),
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
  });

  it("returns Forbidden when caller does not own the debt", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeFinancing("owner"));

    const result = await projectDebtPayoff(
      { debts, clock },
      {
        userId: "intruder",
        debtId: "debt-1",
        monthlyPayment: makeMoney(500),
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
  });
});
