import { describe, expect, it } from "vitest";

import type {
  DebtEntity,
  FinancingDebt,
  PersonalLoanDebt,
  RecurringDebt,
  CreditCardDebt,
} from "@/domain/entities/debt.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { buildForwardMilestones } from "./forward-milestones.service";

const NOW = new Date(Date.UTC(2026, 5, 15)); // 2026-06-15, currentIso = "2026-06"

function rate(annual: number): InterestRate {
  const r = InterestRate.fromAnnual(annual);
  if (!isOk(r)) throw new Error("rate setup failed");
  return r.value;
}

function makeFinancing(o: {
  id?: string;
  label?: string;
  startDate?: Date;
  termMonths?: number;
  status?: "active" | "paid_off" | "written_off";
}): FinancingDebt {
  return {
    id: o.id ?? "fin-1",
    userId: "u",
    profileId: "p",
    kind: "financing",
    label: o.label ?? "Financiamento do carro",
    status: o.status ?? "active",
    originalPrincipal: Money.fromCents(10_000_000n),
    currentBalance: Money.fromCents(5_000_000n),
    startDate: o.startDate ?? new Date(Date.UTC(2026, 0, 1)),
    expectedEndDate: null,
    notes: null,
    amortizationMethod: "PRICE",
    annualInterestRate: rate(0.1),
    termMonths: o.termMonths ?? 12,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    createdAt: new Date(Date.UTC(2026, 0, 1)),
    updatedAt: new Date(Date.UTC(2026, 0, 1)),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makePersonalLoan(o: {
  id?: string;
  startDate?: Date;
  termMonths?: number;
}): PersonalLoanDebt {
  return {
    id: o.id ?? "loan-1",
    userId: "u",
    profileId: "p",
    kind: "personal_loan",
    label: "Empréstimo",
    status: "active",
    originalPrincipal: Money.fromCents(1_000_000n),
    currentBalance: Money.fromCents(500_000n),
    startDate: o.startDate ?? new Date(Date.UTC(2026, 0, 1)),
    expectedEndDate: null,
    notes: null,
    annualInterestRate: rate(0.2),
    termMonths: o.termMonths ?? 6,
    monthlyInstallment: Money.fromCents(180_000n),
    dueDay: null,
    createdAt: new Date(Date.UTC(2026, 0, 1)),
    updatedAt: new Date(Date.UTC(2026, 0, 1)),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makeRecurring(o: {
  id?: string;
  label?: string;
  expectedEndDate?: Date | null;
}): RecurringDebt {
  return {
    id: o.id ?? "rec-1",
    userId: "u",
    profileId: "p",
    kind: "recurring",
    label: o.label ?? "Plano de saúde",
    status: "active",
    originalPrincipal: Money.fromCents(0n),
    currentBalance: Money.fromCents(0n),
    startDate: new Date(Date.UTC(2025, 0, 1)),
    expectedEndDate: o.expectedEndDate ?? null,
    notes: null,
    createdAt: new Date(Date.UTC(2025, 0, 1)),
    updatedAt: new Date(Date.UTC(2025, 0, 1)),
    deletedAt: null,
    recurringFrequency: "monthly",
    recurringAmountCents: 30_000n,
    expenseCategory: "health",
    dueDay: null,
  };
}

function makeCreditCard(): CreditCardDebt {
  return {
    id: "cc-1",
    userId: "u",
    profileId: "p",
    kind: "credit_card",
    label: "Cartão",
    status: "active",
    originalPrincipal: Money.fromCents(200_000n),
    currentBalance: Money.fromCents(200_000n),
    startDate: new Date(Date.UTC(2026, 5, 8)),
    expectedEndDate: null,
    notes: null,
    creditLimit: Money.fromCents(680_000n),
    statementDay: 1,
    dueDay: 16,
    currentStatement: Money.fromCents(200_000n),
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [
      {
        description: "TV",
        total: Money.fromCents(600_000n),
        installmentsTotal: 6,
        installmentsRemaining: 4,
        monthlyValue: Money.fromCents(100_000n),
      },
    ],
    createdAt: new Date(Date.UTC(2026, 5, 8)),
    updatedAt: new Date(Date.UTC(2026, 5, 8)),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makeScheduledOut(o: {
  id: string;
  description?: string;
  occurredAt: Date;
  direction?: "in" | "out";
  status?: "paid" | "scheduled";
  excluded?: boolean;
}): TransactionEntity {
  return {
    id: o.id,
    userId: "u",
    profileId: "p",
    direction: o.direction ?? "out",
    amount: Money.fromCents(120_000n),
    description: o.description ?? "IPVA do carro",
    category: null,
    accountId: "acc-1",
    assetId: null,
    occurredAt: o.occurredAt,
    status: o.status ?? "scheduled",
    excludedFromTotals: o.excluded ?? false,
    source: "manual",
    externalId: null,
    createdAt: new Date(Date.UTC(2026, 5, 1)),
    deletedAt: null,
  };
}

const EMPTY = { now: NOW, debts: [] as DebtEntity[], transactions: [] as TransactionEntity[] };

describe("buildForwardMilestones", () => {
  it("financing debt yields a debt_payoff at startDate + termMonths - 1", () => {
    const out = buildForwardMilestones({
      ...EMPTY,
      debts: [makeFinancing({ startDate: new Date(Date.UTC(2026, 0, 1)), termMonths: 12 })],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "debt_payoff",
      entityLabel: "Financiamento do carro",
      monthIso: "2026-12",
      href: "/app/dividas/fin-1",
    });
  });

  it("personal_loan also yields a debt_payoff", () => {
    const out = buildForwardMilestones({
      ...EMPTY,
      debts: [makePersonalLoan({ startDate: new Date(Date.UTC(2026, 0, 1)), termMonths: 9 })],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "debt_payoff", monthIso: "2026-09" });
  });

  it("credit_card never yields a milestone (cut from v1)", () => {
    const out = buildForwardMilestones({ ...EMPTY, debts: [makeCreditCard()] });
    expect(out).toHaveLength(0);
  });

  it("recurring with expectedEndDate yields a recurring_end at that month", () => {
    const out = buildForwardMilestones({
      ...EMPTY,
      debts: [makeRecurring({ expectedEndDate: new Date(Date.UTC(2026, 11, 10)) })],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "recurring_end",
      entityLabel: "Plano de saúde",
      monthIso: "2026-12",
      href: "/app/dividas/rec-1",
    });
  });

  it("recurring without expectedEndDate yields nothing", () => {
    const out = buildForwardMilestones({ ...EMPTY, debts: [makeRecurring({ expectedEndDate: null })] });
    expect(out).toHaveLength(0);
  });

  it("inactive debt is ignored", () => {
    const out = buildForwardMilestones({
      ...EMPTY,
      debts: [makeFinancing({ status: "paid_off", termMonths: 12 })],
    });
    expect(out).toHaveLength(0);
  });

  it("future scheduled out transaction yields a scheduled_charge linking to lancamentos", () => {
    const out = buildForwardMilestones({
      ...EMPTY,
      transactions: [makeScheduledOut({ id: "t1", occurredAt: new Date(Date.UTC(2026, 8, 5)), description: "IPVA do carro" })],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "scheduled_charge",
      entityLabel: "IPVA do carro",
      monthIso: "2026-09",
      href: "/app/lancamentos",
    });
  });

  it("paid, incoming, excluded, and past scheduled transactions are filtered out", () => {
    const out = buildForwardMilestones({
      ...EMPTY,
      transactions: [
        makeScheduledOut({ id: "paid", occurredAt: new Date(Date.UTC(2026, 8, 5)), status: "paid" }),
        makeScheduledOut({ id: "in", occurredAt: new Date(Date.UTC(2026, 8, 5)), direction: "in" }),
        makeScheduledOut({ id: "excl", occurredAt: new Date(Date.UTC(2026, 8, 5)), excluded: true }),
        makeScheduledOut({ id: "past", occurredAt: new Date(Date.UTC(2026, 2, 5)) }),
      ],
    });
    expect(out).toHaveLength(0);
  });

  it("caps scheduled charges to the 3 nearest", () => {
    const out = buildForwardMilestones({
      ...EMPTY,
      transactions: [
        makeScheduledOut({ id: "t4", occurredAt: new Date(Date.UTC(2027, 3, 5)) }),
        makeScheduledOut({ id: "t1", occurredAt: new Date(Date.UTC(2026, 7, 5)) }),
        makeScheduledOut({ id: "t3", occurredAt: new Date(Date.UTC(2026, 11, 5)) }),
        makeScheduledOut({ id: "t2", occurredAt: new Date(Date.UTC(2026, 9, 5)) }),
      ],
    });
    expect(out.map((m) => m.monthIso)).toEqual(["2026-08", "2026-10", "2026-12"]);
  });

  it("returns empty when nothing is dated", () => {
    expect(buildForwardMilestones({ ...EMPTY })).toHaveLength(0);
  });

  it("drops milestones beyond the 24-month window", () => {
    const out = buildForwardMilestones({
      ...EMPTY,
      debts: [
        makeFinancing({ id: "near", startDate: new Date(Date.UTC(2026, 0, 1)), termMonths: 12 }), // 2026-12 in
        makeFinancing({ id: "far", startDate: new Date(Date.UTC(2026, 0, 1)), termMonths: 360 }), // 2055 out
      ],
    });
    expect(out.map((m) => m.href)).toEqual(["/app/dividas/near"]);
  });

  it("sorts ascending by month", () => {
    const out = buildForwardMilestones({
      ...EMPTY,
      debts: [
        makeFinancing({ id: "dec", startDate: new Date(Date.UTC(2026, 0, 1)), termMonths: 12 }), // 2026-12
        makeRecurring({ id: "aug", expectedEndDate: new Date(Date.UTC(2026, 7, 10)) }), // 2026-08
      ],
    });
    expect(out.map((m) => m.monthIso)).toEqual(["2026-08", "2026-12"]);
  });
});
