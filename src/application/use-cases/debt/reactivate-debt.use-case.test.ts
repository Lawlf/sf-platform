import { describe, expect, it, vi } from "vitest";

import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity, PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors";
import { DebtAlreadyActive, DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr } from "@/shared/errors";

import { reactivateDebt } from "./reactivate-debt.use-case";

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

function makePaymentRepo(): DebtPaymentRepository {
  return {
    listForDebt: vi.fn(),
    listForUserInRange: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-21T10:00:00Z")): Clock {
  return { now: vi.fn(() => now) };
}

function makeDebt(overrides: Partial<PersonalLoanDebt> = {}): PersonalLoanDebt {
  const moneyR = Money.from(1000);
  const rateR = InterestRate.fromAnnual(0.2);
  if (moneyR._tag !== "ok" || rateR._tag !== "ok") throw new Error("test setup");
  return {
    id: "debt-1",
    userId: "user-1",
    label: "Empréstimo",
    status: "paid_off",
    originalPrincipal: moneyR.value,
    currentBalance: moneyR.value,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "personal_loan",
    annualInterestRate: rateR.value,
    termMonths: 6,
    monthlyInstallment: moneyR.value,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  };
}

function makePayment(overrides: Partial<DebtPaymentEntity> = {}): DebtPaymentEntity {
  return {
    id: "pay-1",
    debtId: "debt-1",
    paidAt: new Date("2026-03-01T00:00:00Z"),
    amount: Money.fromCents(100_000n),
    principalPortion: Money.fromCents(100_000n),
    interestPortion: Money.fromCents(0n),
    isExtra: false,
    isClosingPayment: false,
    ...overrides,
  };
}

describe("reactivateDebt", () => {
  it("desfaz closing payment: deleta + restaura saldo + status=active", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock(new Date("2026-05-21T10:00:00Z"));

    // Dívida arquivada por archiveDebt com closing payment de R$ 450,00.
    const debt = makeDebt({ status: "paid_off", currentBalance: Money.fromCents(0n) });
    const closing = makePayment({
      id: "closing-1",
      paidAt: new Date("2026-04-01T00:00:00Z"),
      amount: Money.fromCents(450_000n),
      principalPortion: Money.fromCents(450_000n),
      isExtra: true,
      isClosingPayment: true,
    });
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(debt);
    (payments.listForDebt as ReturnType<typeof vi.fn>).mockResolvedValue([closing]);
    (payments.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (debts.update as ReturnType<typeof vi.fn>).mockResolvedValue(debt);

    const result = await reactivateDebt(
      { debts, payments, clock },
      { userId: "user-1", debtId: "debt-1" },
    );

    expect(result._tag).toBe("ok");
    expect(payments.delete).toHaveBeenCalledWith("closing-1");
    expect(debts.setStatus).not.toHaveBeenCalled();
    expect(debts.update).toHaveBeenCalledTimes(1);
    const updated = (debts.update as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    expect(updated.currentBalance.toCents()).toBe(450_000n);
    expect(updated.status).toBe("active");
    expect(updated.updatedAt).toEqual(new Date("2026-05-21T10:00:00Z"));
  });

  it("dívida legada (sem closing payment): apenas troca status, sem mexer em payments", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt());
    (payments.listForDebt as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (debts.setStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await reactivateDebt(
      { debts, payments, clock },
      { userId: "user-1", debtId: "debt-1" },
    );

    expect(result._tag).toBe("ok");
    expect(payments.delete).not.toHaveBeenCalled();
    expect(debts.update).not.toHaveBeenCalled();
    expect(debts.setStatus).toHaveBeenCalledWith("debt-1", "active");
  });

  it("preserva pagamentos regulares: deleta apenas o closing payment", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    const debt = makeDebt({ status: "paid_off", currentBalance: Money.fromCents(0n) });
    const regular1 = makePayment({
      id: "reg-1",
      paidAt: new Date("2026-02-01T00:00:00Z"),
      principalPortion: Money.fromCents(200_000n),
    });
    const regular2 = makePayment({
      id: "reg-2",
      paidAt: new Date("2026-03-01T00:00:00Z"),
      principalPortion: Money.fromCents(200_000n),
    });
    const closing = makePayment({
      id: "closing-1",
      paidAt: new Date("2026-04-01T00:00:00Z"),
      amount: Money.fromCents(100_000n),
      principalPortion: Money.fromCents(100_000n),
      isExtra: true,
      isClosingPayment: true,
    });
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(debt);
    (payments.listForDebt as ReturnType<typeof vi.fn>).mockResolvedValue([
      regular1,
      regular2,
      closing,
    ]);
    (debts.update as ReturnType<typeof vi.fn>).mockResolvedValue(debt);

    const result = await reactivateDebt(
      { debts, payments, clock },
      { userId: "user-1", debtId: "debt-1" },
    );

    expect(result._tag).toBe("ok");
    expect(payments.delete).toHaveBeenCalledTimes(1);
    expect(payments.delete).toHaveBeenCalledWith("closing-1");
    const updated = (debts.update as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    expect(updated.currentBalance.toCents()).toBe(100_000n);
    expect(updated.status).toBe("active");
  });

  it("múltiplos closings: deleta apenas o mais recente (paidAt maior)", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    const debt = makeDebt({ status: "paid_off", currentBalance: Money.fromCents(0n) });
    const oldClosing = makePayment({
      id: "closing-old",
      paidAt: new Date("2026-02-01T00:00:00Z"),
      amount: Money.fromCents(50_000n),
      principalPortion: Money.fromCents(50_000n),
      isExtra: true,
      isClosingPayment: true,
    });
    const middleClosing = makePayment({
      id: "closing-mid",
      paidAt: new Date("2026-03-01T00:00:00Z"),
      amount: Money.fromCents(75_000n),
      principalPortion: Money.fromCents(75_000n),
      isExtra: true,
      isClosingPayment: true,
    });
    const latestClosing = makePayment({
      id: "closing-latest",
      paidAt: new Date("2026-04-01T00:00:00Z"),
      amount: Money.fromCents(120_000n),
      principalPortion: Money.fromCents(120_000n),
      isExtra: true,
      isClosingPayment: true,
    });
    // Ordem deliberadamente embaralhada para confirmar que o use-case ordena.
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(debt);
    (payments.listForDebt as ReturnType<typeof vi.fn>).mockResolvedValue([
      middleClosing,
      latestClosing,
      oldClosing,
    ]);
    (debts.update as ReturnType<typeof vi.fn>).mockResolvedValue(debt);

    const result = await reactivateDebt(
      { debts, payments, clock },
      { userId: "user-1", debtId: "debt-1" },
    );

    expect(result._tag).toBe("ok");
    expect(payments.delete).toHaveBeenCalledTimes(1);
    expect(payments.delete).toHaveBeenCalledWith("closing-latest");
    const updated = (debts.update as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DebtEntity;
    // Restaura apenas o principal do closing mais recente (R$ 1.200,00).
    expect(updated.currentBalance.toCents()).toBe(120_000n);
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await reactivateDebt(
      { debts, payments, clock },
      { userId: "user-1", debtId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
    expect(debts.setStatus).not.toHaveBeenCalled();
    expect(payments.delete).not.toHaveBeenCalled();
    expect(payments.listForDebt).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the debt", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt({ userId: "owner" }));

    const result = await reactivateDebt(
      { debts, payments, clock },
      { userId: "intruder", debtId: "debt-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(debts.setStatus).not.toHaveBeenCalled();
    expect(payments.delete).not.toHaveBeenCalled();
    expect(payments.listForDebt).not.toHaveBeenCalled();
  });

  it("returns DebtAlreadyActive when status is already active", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentRepo();
    const clock = makeClock();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt({ status: "active" }));

    const result = await reactivateDebt(
      { debts, payments, clock },
      { userId: "user-1", debtId: "debt-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtAlreadyActive);
    }
    expect(debts.setStatus).not.toHaveBeenCalled();
    expect(payments.delete).not.toHaveBeenCalled();
    expect(payments.listForDebt).not.toHaveBeenCalled();
  });
});
