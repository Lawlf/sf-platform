import { describe, expect, it, vi } from "vitest";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { CreditCardStatementExceedsLimit } from "@/domain/errors/asset-errors";
import { registerDebt } from "./register-debt.use-case";

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

function makeClock(now = new Date("2026-01-15T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeMoney(value: number): Money {
  const r = Money.from(value);
  if (!isOk(r)) throw new Error("test setup: invalid money");
  return r.value;
}

function makeRate(annualDecimal: number): InterestRate {
  const r = InterestRate.fromAnnual(annualDecimal);
  if (!isOk(r)) throw new Error("test setup: invalid rate");
  return r.value;
}

describe("registerDebt", () => {
  it("creates a financing debt with currentBalance = originalPrincipal", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.create as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);

    const principal = makeMoney(100000);
    const rate = makeRate(0.12);

    const result = await registerDebt(
      { debts, clock },
      {
        userId: "user-1",
        label: "Casa propria",
        notes: null,
        startDate: new Date("2026-01-01"),
        expectedEndDate: new Date("2031-01-01"),
        kind: "financing",
        originalPrincipal: principal,
        annualInterestRate: rate,
        termMonths: 60,
        amortizationMethod: "PRICE",
        monthlyInsurance: null,
        monthlyAdminFee: null,
      },
    );

    expect(result._tag).toBe("ok");
    expect(debts.create).toHaveBeenCalledTimes(1);
    const arg = (debts.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    expect(arg.kind).toBe("financing");
    expect(arg.status).toBe("active");
    expect(arg.userId).toBe("user-1");
    expect(arg.currentBalance.toCents()).toBe(principal.toCents());
    expect(arg.originalPrincipal.toCents()).toBe(principal.toCents());
    if (arg.kind === "financing") {
      expect(arg.amortizationMethod).toBe("PRICE");
      expect(arg.termMonths).toBe(60);
    }
  });

  it("creates a personal_loan debt", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.create as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);

    const principal = makeMoney(10000);
    const monthlyInstallment = makeMoney(950);

    const result = await registerDebt(
      { debts, clock },
      {
        userId: "user-2",
        label: "Emprestimo pessoal",
        notes: "para reforma",
        startDate: new Date("2026-02-01"),
        expectedEndDate: null,
        kind: "personal_loan",
        originalPrincipal: principal,
        annualInterestRate: makeRate(0.24),
        termMonths: 12,
        monthlyInstallment,
      },
    );

    expect(result._tag).toBe("ok");
    const arg = (debts.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    expect(arg.kind).toBe("personal_loan");
    expect(arg.currentBalance.toCents()).toBe(principal.toCents());
    if (arg.kind === "personal_loan") {
      expect(arg.monthlyInstallment.toCents()).toBe(monthlyInstallment.toCents());
      expect(arg.termMonths).toBe(12);
    }
  });

  it("creates a credit_card debt with currentBalance = statement + revolving", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.create as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);

    const statement = makeMoney(1500);
    const revolving = makeMoney(800);
    const limit = makeMoney(10000);

    const result = await registerDebt(
      { debts, clock },
      {
        userId: "user-3",
        label: "Nubank",
        notes: null,
        startDate: new Date("2026-01-01"),
        expectedEndDate: null,
        kind: "credit_card",
        creditLimit: limit,
        currentStatement: statement,
        statementDay: 5,
        dueDay: 15,
        revolvingBalance: revolving,
        revolvingMonthlyRate: makeRate(0.15),
        installmentPurchases: [],
      },
    );

    expect(result._tag).toBe("ok");
    const arg = (debts.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    expect(arg.kind).toBe("credit_card");
    expect(arg.currentBalance.toCents()).toBe(statement.toCents() + revolving.toCents());
    expect(arg.originalPrincipal.toCents()).toBe(statement.toCents());
    if (arg.kind === "credit_card") {
      expect(arg.statementDay).toBe(5);
      expect(arg.dueDay).toBe(15);
      expect(arg.installmentPurchases).toEqual([]);
    }
  });

  it("rejects a credit_card debt where statement + revolving exceeds the limit", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.create as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);

    const result = await registerDebt(
      { debts, clock },
      {
        userId: "user-4",
        label: "Cartão estourado",
        notes: null,
        startDate: new Date("2026-01-01"),
        expectedEndDate: null,
        kind: "credit_card",
        creditLimit: makeMoney(1500),
        currentStatement: makeMoney(3000),
        statementDay: 5,
        dueDay: 15,
        revolvingBalance: null,
        revolvingMonthlyRate: null,
        installmentPurchases: [],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(CreditCardStatementExceedsLimit);
    }
    expect((debts.create as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("creates a recurring debt with currentBalance=0 and persists recurring fields", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.create as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);

    const result = await registerDebt(
      { debts, clock },
      {
        kind: "recurring",
        userId: "user-r",
        label: "Netflix",
        recurringFrequency: "monthly",
        recurringAmountCents: 5990n,
        expenseCategory: "subscriptions",
        startDate: new Date("2026-05-01"),
        endDate: null,
        notes: undefined,
      },
    );

    expect(result._tag).toBe("ok");
    const arg = (debts.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    expect(arg.kind).toBe("recurring");
    expect(arg.status).toBe("active");
    expect(arg.userId).toBe("user-r");
    // No outstanding balance for recurring; it's a cash-flow marker.
    expect(arg.currentBalance.toCents()).toBe(0n);
    expect(arg.originalPrincipal.toCents()).toBe(5990n);
    expect(arg.expectedEndDate).toBeNull();
    expect(arg.notes).toBeNull();
    if (arg.kind === "recurring") {
      expect(arg.recurringFrequency).toBe("monthly");
      expect(arg.recurringAmountCents).toBe(5990n);
      expect(arg.expenseCategory).toBe("subscriptions");
    }
  });

  it("creates an overdraft debt with originalPrincipal = currentBalance and lastChargeDate=null", async () => {
    const debts = makeDebtRepo();
    const clock = makeClock();
    (debts.create as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);

    const balance = makeMoney(2500);

    const result = await registerDebt(
      { debts, clock },
      {
        userId: "user-4",
        label: "Cheque especial Itau",
        notes: null,
        startDate: new Date("2026-03-01"),
        expectedEndDate: null,
        kind: "overdraft",
        currentBalance: balance,
        bankName: "Itau",
        monthlyRate: makeRate(2.5),
      },
    );

    expect(result._tag).toBe("ok");
    const arg = (debts.create as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    expect(arg.kind).toBe("overdraft");
    expect(arg.currentBalance.toCents()).toBe(balance.toCents());
    expect(arg.originalPrincipal.toCents()).toBe(balance.toCents());
    if (arg.kind === "overdraft") {
      expect(arg.bankName).toBe("Itau");
      expect(arg.lastChargeDate).toBeNull();
    }
  });
});
