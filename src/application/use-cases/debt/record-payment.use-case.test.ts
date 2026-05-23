import { describe, expect, it, vi } from "vitest";

import type { DebtEntity, PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors";
import { DebtNotFound, InvalidAmortizationParamsError } from "@/domain/errors/financial-errors";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { DistributedLock } from "@/domain/ports/services/distributed-lock.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors";

import { recordPayment } from "./record-payment.use-case";

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

function makePaymentsRepo(): DebtPaymentRepository {
  return {
    listForDebt: vi.fn(),
    listForUserInRange: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
  };
}

function makeClock(now = new Date("2026-02-15T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}


function makeLock(): DistributedLock {
  return {
    run: (_k, _t, fn) => fn(),
  };
}

function makeMoney(v: number): Money {
  const r = Money.from(v);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeRate(v: number): InterestRate {
  const r = InterestRate.fromAnnual(v);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeDebt(opts: { userId?: string; currentBalance?: number } = {}): PersonalLoanDebt {
  const principal = makeMoney(10000);
  const balance = makeMoney(opts.currentBalance ?? 10000);
  return {
    id: "debt-1",
    userId: opts.userId ?? "user-1",
    label: "Emprestimo",
    status: "active",
    originalPrincipal: principal,
    currentBalance: balance,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "personal_loan",
    annualInterestRate: makeRate(0.24),
    termMonths: 12,
    monthlyInstallment: makeMoney(950),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

describe("recordPayment", () => {
  it("records a payment and reduces currentBalance by principalPortion", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt());
    (debts.update as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);
    (payments.create as ReturnType<typeof vi.fn>).mockImplementation(async (p) => p);

    const amount = makeMoney(950);
    const principalPortion = makeMoney(750);
    const interestPortion = makeMoney(200);

    const result = await recordPayment(
      { debts, payments, clock, lock: makeLock() },
      {
        userId: "user-1",
        debtId: "debt-1",
        amount,
        principalPortion,
        interestPortion,
        isExtra: false,
        paidAt: new Date("2026-02-10"),
      },
    );

    expect(result._tag).toBe("ok");
    expect(debts.update).toHaveBeenCalledTimes(1);
    const updatedDebt = (debts.update as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    expect(updatedDebt.currentBalance.toCents()).toBe(makeMoney(9250).toCents());
    expect(updatedDebt.status).toBe("active");
    expect(updatedDebt.updatedAt).toEqual(new Date("2026-02-15T10:00:00Z"));

    expect(payments.create).toHaveBeenCalledTimes(1);
    const payment = (payments.create as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(payment.debtId).toBe("debt-1");
    expect(payment.amount).toBe(amount);
    expect(payment.principalPortion).toBe(principalPortion);
    expect(payment.interestPortion).toBe(interestPortion);
    expect(payment.isExtra).toBe(false);
    expect(payment.isClosingPayment).toBe(false);
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await recordPayment(
      { debts, payments, clock, lock: makeLock() },
      {
        userId: "user-1",
        debtId: "missing",
        amount: makeMoney(100),
        principalPortion: makeMoney(80),
        interestPortion: makeMoney(20),
        isExtra: false,
        paidAt: new Date("2026-02-10"),
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
    expect(debts.update).not.toHaveBeenCalled();
    expect(payments.create).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the debt", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt({ userId: "owner" }));

    const result = await recordPayment(
      { debts, payments, clock, lock: makeLock() },
      {
        userId: "intruder",
        debtId: "debt-1",
        amount: makeMoney(100),
        principalPortion: makeMoney(80),
        interestPortion: makeMoney(20),
        isExtra: false,
        paidAt: new Date("2026-02-10"),
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(debts.update).not.toHaveBeenCalled();
    expect(payments.create).not.toHaveBeenCalled();
  });

  it("returns InvalidAmortizationParamsError when amount != principal + interest", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt());

    const result = await recordPayment(
      { debts, payments, clock, lock: makeLock() },
      {
        userId: "user-1",
        debtId: "debt-1",
        amount: makeMoney(1000), // 750 + 200 = 950, not 1000
        principalPortion: makeMoney(750),
        interestPortion: makeMoney(200),
        isExtra: false,
        paidAt: new Date("2026-02-10"),
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAmortizationParamsError);
    }
    expect(debts.update).not.toHaveBeenCalled();
    expect(payments.create).not.toHaveBeenCalled();
  });

  it("transitions status to paid_off when balance hits zero", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    const clock = makeClock();
    // Balance of 500; principalPortion = 500 zeros out
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDebt({ currentBalance: 500 }),
    );
    (debts.update as ReturnType<typeof vi.fn>).mockImplementation(async (e: DebtEntity) => e);
    (payments.create as ReturnType<typeof vi.fn>).mockImplementation(async (p) => p);

    const result = await recordPayment(
      { debts, payments, clock, lock: makeLock() },
      {
        userId: "user-1",
        debtId: "debt-1",
        amount: makeMoney(550),
        principalPortion: makeMoney(500),
        interestPortion: makeMoney(50),
        isExtra: true,
        paidAt: new Date("2026-02-10"),
      },
    );

    expect(result._tag).toBe("ok");
    const updated = (debts.update as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    expect(updated.currentBalance.toCents()).toBe(0n);
    expect(updated.status).toBe("paid_off");
    const payment = (payments.create as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(payment.isClosingPayment).toBe(false);
  });
});
