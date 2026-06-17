import { describe, expect, it, vi } from "vitest";

import type { PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { DistributedLock } from "@/domain/ports/services/distributed-lock.service";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr } from "@/shared/errors/result";

import { archiveDebt } from "./archive-debt.use-case";

function makeDebtRepo(): DebtRepositoryPort {
  return {
    findById: vi.fn(),
    listForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
}

function makePaymentRepo(): DebtPaymentRepositoryPort {
  return {
    listForDebt: vi.fn(),
    listForUserInRange: vi.fn(),
    create: vi.fn(async (entity) => entity),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-21T10:00:00Z")): Clock {
  return { now: vi.fn(() => now) };
}


function makeLock(): DistributedLock {
  return {
    run: (_k, _t, fn) => fn(),
  };
}

function makeDebt(userId = "user-1", opts?: { currentBalanceBRL?: number }): PersonalLoanDebt {
  const originalR = Money.from(1000);
  const balanceR = Money.from(opts?.currentBalanceBRL ?? 1000);
  const rateR = InterestRate.fromAnnual(0.2);
  if (originalR._tag !== "ok" || balanceR._tag !== "ok" || rateR._tag !== "ok") {
    throw new Error("test setup");
  }
  return {
    id: "debt-1",
    userId,
    label: "Test",
    status: "active",
    originalPrincipal: originalR.value,
    currentBalance: balanceR.value,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "personal_loan",
    dueDay: null,
    annualInterestRate: rateR.value,
    termMonths: 6,
    monthlyInstallment: originalR.value,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

describe("archiveDebt", () => {
  it("creates a closing DebtPayment, zeros balance and sets paid_off when currentBalance > 0", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock(new Date("2026-05-21T10:00:00Z"));
    const debt = makeDebt("user-1", { currentBalanceBRL: 4500 });
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(debt);
    (debts.update as ReturnType<typeof vi.fn>).mockResolvedValue(debt);

    const result = await archiveDebt(
      { debts, payments, clock, lock: makeLock() },
      { userId: "user-1", debtId: "debt-1", reason: "paid_off" },
    );

    expect(result._tag).toBe("ok");
    expect(payments.create).toHaveBeenCalledTimes(1);
    const created = (payments.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Parameters<
      DebtPaymentRepositoryPort["create"]
    >[0];
    expect(created.debtId).toBe("debt-1");
    expect(created.amount.toCents()).toBe(450000n);
    expect(created.principalPortion.toCents()).toBe(450000n);
    expect(created.interestPortion.toCents()).toBe(0n);
    expect(created.isExtra).toBe(true);
    expect(created.isClosingPayment).toBe(true);
    expect(created.paidAt).toEqual(new Date("2026-05-21T10:00:00Z"));

    expect(debts.update).toHaveBeenCalledTimes(1);
    const updated = (debts.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Parameters<
      DebtRepositoryPort["update"]
    >[0];
    expect(updated.currentBalance.toCents()).toBe(0n);
    expect(updated.status).toBe("paid_off");
    expect(updated.updatedAt).toEqual(new Date("2026-05-21T10:00:00Z"));
    expect(debts.setStatus).not.toHaveBeenCalled();
  });

  it("only sets status (no payment) when paid_off and currentBalance is already zero", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDebt("user-1", { currentBalanceBRL: 0 }),
    );
    (debts.setStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await archiveDebt(
      { debts, payments, clock, lock: makeLock() },
      { userId: "user-1", debtId: "debt-1", reason: "paid_off" },
    );

    expect(result._tag).toBe("ok");
    expect(payments.create).not.toHaveBeenCalled();
    expect(debts.update).not.toHaveBeenCalled();
    expect(debts.setStatus).toHaveBeenCalledWith("debt-1", "paid_off");
  });

  it("only sets status (no payment) for written_off, even when balance > 0", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDebt("user-1", { currentBalanceBRL: 4500 }),
    );
    (debts.setStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await archiveDebt(
      { debts, payments, clock, lock: makeLock() },
      { userId: "user-1", debtId: "debt-1", reason: "written_off" },
    );

    expect(result._tag).toBe("ok");
    expect(payments.create).not.toHaveBeenCalled();
    expect(debts.update).not.toHaveBeenCalled();
    expect(debts.setStatus).toHaveBeenCalledWith("debt-1", "written_off");
  });

  it("written_off with a note persists the note via update (no setStatus)", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDebt("user-1", { currentBalanceBRL: 4500 }),
    );
    (debts.update as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await archiveDebt(
      { debts, payments, clock, lock: makeLock() },
      { userId: "user-1", debtId: "debt-1", reason: "written_off", note: "  parei em 03/2023  " },
    );

    expect(result._tag).toBe("ok");
    expect(debts.setStatus).not.toHaveBeenCalled();
    expect(payments.create).not.toHaveBeenCalled();
    expect(debts.update).toHaveBeenCalledTimes(1);
    const arg = (debts.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(arg?.status).toBe("written_off");
    expect(arg?.notes).toBe("parei em 03/2023");
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await archiveDebt(
      { debts, payments, clock, lock: makeLock() },
      { userId: "user-1", debtId: "missing", reason: "written_off" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
    expect(debts.setStatus).not.toHaveBeenCalled();
    expect(payments.create).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the debt", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt("owner"));

    const result = await archiveDebt(
      { debts, payments, clock, lock: makeLock() },
      { userId: "intruder", debtId: "debt-1", reason: "paid_off" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(debts.setStatus).not.toHaveBeenCalled();
    expect(payments.create).not.toHaveBeenCalled();
    expect(debts.update).not.toHaveBeenCalled();
  });
});
