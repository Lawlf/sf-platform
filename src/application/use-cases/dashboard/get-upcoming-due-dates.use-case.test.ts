import { describe, expect, it, vi } from "vitest";

import type {
  CreditCardDebt,
  FinancingDebt,
  OverdraftDebt,
  PersonalLoanDebt,
} from "@/domain/entities/debt.entity";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { getUpcomingDueDates } from "./get-upcoming-due-dates.use-case";

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

function makeClock(now: Date) {
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

function makeFinancing(overrides: Partial<FinancingDebt> = {}): FinancingDebt {
  const principal = makeMoney(50000);
  return {
    id: overrides.id ?? "debt-fin",
    userId: overrides.userId ?? "user-1",
    profileId: overrides.profileId ?? "profile-1",
    label: overrides.label ?? "Casa",
    status: "active",
    originalPrincipal: principal,
    currentBalance: principal,
    startDate: overrides.startDate ?? new Date("2026-01-15"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "financing",
    amortizationMethod: "PRICE",
    annualInterestRate: makeRate(0.1),
    termMonths: 60,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  };
}

function makePersonalLoan(overrides: Partial<PersonalLoanDebt> = {}): PersonalLoanDebt {
  const principal = makeMoney(10000);
  return {
    id: overrides.id ?? "debt-pl",
    userId: overrides.userId ?? "user-1",
    profileId: overrides.profileId ?? "profile-1",
    label: overrides.label ?? "Emprestimo",
    status: "active",
    originalPrincipal: principal,
    currentBalance: principal,
    startDate: overrides.startDate ?? new Date("2026-01-10"),
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
    ...overrides,
  };
}

function makeCreditCard(overrides: Partial<CreditCardDebt> = {}): CreditCardDebt {
  const stmt = makeMoney(1500);
  return {
    id: overrides.id ?? "debt-cc",
    userId: overrides.userId ?? "user-1",
    profileId: overrides.profileId ?? "profile-1",
    label: overrides.label ?? "Cartao",
    status: "active",
    originalPrincipal: stmt,
    currentBalance: stmt,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "credit_card",
    creditLimit: makeMoney(10000),
    statementDay: 5,
    dueDay: overrides.dueDay ?? 15,
    currentStatement: stmt,
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [],
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  };
}

function makeOverdraft(): OverdraftDebt {
  return {
    id: "debt-od",
    userId: "user-1",
    profileId: "profile-1",
    label: "Cheque especial",
    status: "active",
    originalPrincipal: makeMoney(2000),
    currentBalance: makeMoney(2000),
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "overdraft",
    bankName: "Itau",
    monthlyRate: makeRate(2.5),
    lastChargeDate: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

describe("getUpcomingDueDates", () => {
  it("computes next due for a financing debt as start + elapsed + 1 months", async () => {
    const debts = makeDebtRepo();
    const now = new Date(2026, 3, 20); // 2026-04-20 local
    const startDate = new Date(2026, 0, 15); // 2026-01-15 local
    const debt = makeFinancing({ startDate });
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([debt]);

    const result = await getUpcomingDueDates(
      { debts, clock: makeClock(now) },
      { userId: "user-1", profileId: "profile-1", horizonDays: 60 },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(1);
      const due = result.value[0]!;
      // elapsed = 3 months (Jan to Apr), so next = startMonth + 4 = May
      expect(due.dueDate.getMonth()).toBe(4); // May (0-indexed)
      expect(due.dueDate.getDate()).toBe(15);
      expect(due.amount).toBeNull();
    }
  });

  it("rolls a credit card due_day to next month when it is already past in the current month", async () => {
    const debts = makeDebtRepo();
    const now = new Date(2026, 4, 20); // 2026-05-20 local
    const debt = makeCreditCard({ dueDay: 10 }); // 2026-05-10 already passed
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([debt]);

    const result = await getUpcomingDueDates(
      { debts, clock: makeClock(now) },
      { userId: "user-1", profileId: "profile-1", horizonDays: 30 },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(1);
      const due = result.value[0]!;
      expect(due.dueDate.getMonth()).toBe(5); // rolls to June
      expect(due.dueDate.getDate()).toBe(10);
    }
  });

  it("uses dueDay for the personal loan reminder when set", async () => {
    const debts = makeDebtRepo();
    const now = new Date(2026, 4, 1); // 2026-05-01 local
    const loan = makePersonalLoan({ startDate: new Date(2026, 0, 10), dueDay: 20 });
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([loan]);

    const result = await getUpcomingDueDates(
      { debts, clock: makeClock(now) },
      { userId: "user-1", profileId: "profile-1" },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value).toHaveLength(1);
    const due = result.value[0]!;
    expect(due.dueDate.getMonth()).toBe(4); // May
    expect(due.dueDate.getDate()).toBe(20);
    expect(due.amount).not.toBeNull();
  });

  it("falls back to the startDate day when the personal loan has no dueDay", async () => {
    const debts = makeDebtRepo();
    const now = new Date(2026, 4, 1); // 2026-05-01 local
    const loan = makePersonalLoan({ startDate: new Date(2026, 0, 18), dueDay: null });
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([loan]);

    const result = await getUpcomingDueDates(
      { debts, clock: makeClock(now) },
      { userId: "user-1", profileId: "profile-1" },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.dueDate.getDate()).toBe(18);
  });

  it("excludes overdraft debts from upcoming dues", async () => {
    const debts = makeDebtRepo();
    const now = new Date(2026, 4, 1);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([makeOverdraft()]);

    const result = await getUpcomingDueDates(
      { debts, clock: makeClock(now) },
      { userId: "user-1", profileId: "profile-1" },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(0);
    }
  });

  it("sorts dues by date ascending", async () => {
    const debts = makeDebtRepo();
    const now = new Date(2026, 4, 1); // 2026-05-01 local
    const ccLater = makeCreditCard({ id: "cc-late", label: "CC late", dueDay: 25 });
    const ccEarlier = makeCreditCard({ id: "cc-early", label: "CC early", dueDay: 5 });
    const loan = makePersonalLoan({
      id: "loan-1",
      label: "Loan",
      startDate: new Date(2026, 2, 10), // March 10, so elapsed=2, next = May 10
    });
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([ccLater, loan, ccEarlier]);

    const result = await getUpcomingDueDates(
      { debts, clock: makeClock(now) },
      { userId: "user-1", profileId: "profile-1", horizonDays: 30 },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const days = result.value.map((d) => d.dueDate.getTime());
      const sorted = [...days].sort((a, b) => a - b);
      expect(days).toEqual(sorted);
      expect(result.value[0]!.debtId).toBe("cc-early");
    }
  });
});
