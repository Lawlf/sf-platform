import { describe, expect, it, vi } from "vitest";

import type {
  CreditCardDebt,
  FinancingDebt,
  PersonalLoanDebt,
} from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { getDebtDetail } from "./get-debt-detail.use-case";

function makeDebtRepo(): DebtRepositoryPort {
  return {
    findById: vi.fn(),
    listForProfile: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
}

function makePaymentsRepo(): DebtPaymentRepositoryPort {
  return {
    listForDebt: vi.fn(),
    listForProfileInRange: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
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

function makeFinancing(userId = "user-1"): FinancingDebt {
  const p = makeMoney(50000);
  return {
    id: "debt-1",
    userId,
    profileId: "profile-1",
    label: "Casa",
    status: "active",
    originalPrincipal: p,
    currentBalance: p,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "financing",
    amortizationMethod: "PRICE",
    annualInterestRate: makeRate(0.12),
    termMonths: 12,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makeCreditCard(userId = "user-1"): CreditCardDebt {
  const statement = makeMoney(2000);
  return {
    id: "debt-2",
    userId,
    profileId: "profile-1",
    label: "Nubank",
    status: "active",
    originalPrincipal: statement,
    currentBalance: statement,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "credit_card",
    creditLimit: makeMoney(10000),
    statementDay: 5,
    dueDay: 15,
    currentStatement: statement,
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [],
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makePersonalLoan(userId = "user-1"): PersonalLoanDebt {
  const p = makeMoney(10000);
  return {
    id: "debt-3",
    userId,
    profileId: "profile-1",
    label: "Emprestimo",
    status: "active",
    originalPrincipal: p,
    currentBalance: p,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "personal_loan",
    dueDay: null,
    annualInterestRate: makeRate(0.24),
    termMonths: 12,
    monthlyInstallment: makeMoney(950),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

describe("getDebtDetail", () => {
  it("returns financing debt with amortization schedule", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    const debt = makeFinancing();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(debt);
    (payments.listForDebt as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDebtDetail({ debts, payments }, { userId: "user-1", profileId: "profile-1", debtId: "debt-1" });

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value.debt).toBe(debt);
      expect(result.value.amortization).not.toBeNull();
      expect(result.value.amortization?.termMonths()).toBe(12);
      expect(result.value.payments).toEqual([]);
    }
  });

  it("uses PriceAmortizationService for personal_loan", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    const debt = makePersonalLoan();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(debt);
    (payments.listForDebt as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDebtDetail({ debts, payments }, { userId: "user-1", profileId: "profile-1", debtId: "debt-3" });

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value.amortization).not.toBeNull();
      expect(result.value.amortization?.termMonths()).toBe(12);
    }
  });

  it("returns null amortization for credit_card", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    const debt = makeCreditCard();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(debt);
    (payments.listForDebt as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getDebtDetail({ debts, payments }, { userId: "user-1", profileId: "profile-1", debtId: "debt-2" });

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value.amortization).toBeNull();
    }
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getDebtDetail(
      { debts, payments },
      { userId: "user-1", profileId: "profile-1", debtId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
  });

  it("returns Forbidden when caller does not own the debt", async () => {
    const debts = makeDebtRepo();
    const payments = makePaymentsRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeFinancing("owner"));

    const result = await getDebtDetail(
      { debts, payments },
      { userId: "intruder", profileId: "profile-2", debtId: "debt-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(payments.listForDebt).not.toHaveBeenCalled();
  });
});
