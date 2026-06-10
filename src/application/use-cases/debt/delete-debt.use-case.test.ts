import { describe, expect, it, vi } from "vitest";

import type { PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr } from "@/shared/errors/result";

import { deleteDebt } from "./delete-debt.use-case";

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

function makeAllocationRepo(): AssetDebtAllocationRepositoryPort {
  return {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-21T10:00:00Z")): Clock {
  return { now: vi.fn(() => now) };
}

function makeDebt(userId = "user-1"): PersonalLoanDebt {
  const originalR = Money.from(1000);
  const balanceR = Money.from(500);
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
    deletedAt: null,
    kind: "personal_loan",
    annualInterestRate: rateR.value,
    termMonths: 6,
    monthlyInstallment: originalR.value,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

describe("deleteDebt", () => {
  it("hard-deletes payments + allocations and soft-deletes the debt", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const allocations = makeAllocationRepo();
    const now = new Date("2026-05-21T10:00:00Z");
    const clock = makeClock(now);
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt("user-1"));

    const result = await deleteDebt(
      { debts, payments, allocations, clock },
      { userId: "user-1", debtId: "debt-1" },
    );

    expect(result._tag).toBe("ok");
    expect(payments.deleteByDebtId).toHaveBeenCalledWith("debt-1");
    expect(allocations.deleteByDebtId).toHaveBeenCalledWith("debt-1");
    expect(debts.softDelete).toHaveBeenCalledWith("debt-1", now);
    // Ordem: limpa sub-records antes de marcar a dívida como apagada.
    const paymentsCallOrder = (payments.deleteByDebtId as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const allocsCallOrder = (allocations.deleteByDebtId as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const debtCallOrder = (debts.softDelete as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(paymentsCallOrder).toBeDefined();
    expect(allocsCallOrder).toBeDefined();
    expect(debtCallOrder).toBeDefined();
    if (
      paymentsCallOrder !== undefined &&
      allocsCallOrder !== undefined &&
      debtCallOrder !== undefined
    ) {
      expect(paymentsCallOrder).toBeLessThan(debtCallOrder);
      expect(allocsCallOrder).toBeLessThan(debtCallOrder);
    }
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const allocations = makeAllocationRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await deleteDebt(
      { debts, payments, allocations, clock },
      { userId: "user-1", debtId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
    expect(payments.deleteByDebtId).not.toHaveBeenCalled();
    expect(allocations.deleteByDebtId).not.toHaveBeenCalled();
    expect(debts.softDelete).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the debt", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const allocations = makeAllocationRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt("owner"));

    const result = await deleteDebt(
      { debts, payments, allocations, clock },
      { userId: "intruder", debtId: "debt-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(payments.deleteByDebtId).not.toHaveBeenCalled();
    expect(allocations.deleteByDebtId).not.toHaveBeenCalled();
    expect(debts.softDelete).not.toHaveBeenCalled();
  });

  it("works for archived (paid_off) debts too", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const allocations = makeAllocationRepo();
    const clock = makeClock();
    const archived = { ...makeDebt("user-1"), status: "paid_off" as const };
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(archived);

    const result = await deleteDebt(
      { debts, payments, allocations, clock },
      { userId: "user-1", debtId: "debt-1" },
    );

    expect(result._tag).toBe("ok");
    expect(payments.deleteByDebtId).toHaveBeenCalledWith("debt-1");
    expect(allocations.deleteByDebtId).toHaveBeenCalledWith("debt-1");
    expect(debts.softDelete).toHaveBeenCalledTimes(1);
  });
});
