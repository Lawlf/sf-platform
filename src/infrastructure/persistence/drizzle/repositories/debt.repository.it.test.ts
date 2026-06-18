import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type {
  CreditCardDebt,
  FinancingDebt,
  OverdraftDebt,
  PersonalLoanDebt,
} from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { closeDb, getDb } from "../client";

import { DebtRepository } from "./debt.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-debt-user@saborfinanceiro.com.br";
const LABEL_PREFIX = "it-test-debt-";

const users = new UserRepository();
const repo = new DebtRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from debts where label like ${LABEL_PREFIX + "%"}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function rateAnnual(n: number): InterestRate {
  const r = InterestRate.fromAnnual(n);
  if (!isOk(r)) throw new Error("rate fixture");
  return r.value;
}

function rateMonthly(n: number): InterestRate {
  const r = InterestRate.fromMonthly(n);
  if (!isOk(r)) throw new Error("rate fixture m");
  return r.value;
}

function makeFinancing(overrides: Partial<FinancingDebt> = {}): FinancingDebt {
  return {
    id: randomUUID(),
    userId,
    profileId: userId,
    label: `${LABEL_PREFIX}financing`,
    kind: "financing",
    status: "active",
    originalPrincipal: Money.fromCents(5_000_000n),
    currentBalance: Money.fromCents(5_000_000n),
    startDate: new Date("2024-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    amortizationMethod: "PRICE",
    annualInterestRate: rateAnnual(0.1),
    termMonths: 60,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  } as FinancingDebt;
}

function makePersonalLoan(overrides: Partial<PersonalLoanDebt> = {}): PersonalLoanDebt {
  return {
    id: randomUUID(),
    userId,
    profileId: userId,
    label: `${LABEL_PREFIX}loan`,
    kind: "personal_loan",
    status: "active",
    originalPrincipal: Money.fromCents(200_000n),
    currentBalance: Money.fromCents(200_000n),
    startDate: new Date("2024-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    annualInterestRate: rateAnnual(0.12),
    termMonths: 24,
    monthlyInstallment: Money.fromCents(9000n),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  } as PersonalLoanDebt;
}

function makeCreditCard(overrides: Partial<CreditCardDebt> = {}): CreditCardDebt {
  return {
    id: randomUUID(),
    userId,
    profileId: userId,
    label: `${LABEL_PREFIX}card`,
    kind: "credit_card",
    status: "active",
    originalPrincipal: Money.fromCents(50_000n),
    currentBalance: Money.fromCents(50_000n),
    startDate: new Date("2024-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    creditLimit: Money.fromCents(500_000n),
    statementDay: 5,
    dueDay: 15,
    currentStatement: Money.fromCents(50_000n),
    revolvingBalance: null,
    revolvingMonthlyRate: null,
    installmentPurchases: [],
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  } as CreditCardDebt;
}

function makeOverdraft(overrides: Partial<OverdraftDebt> = {}): OverdraftDebt {
  return {
    id: randomUUID(),
    userId,
    profileId: userId,
    label: `${LABEL_PREFIX}overdraft`,
    kind: "overdraft",
    status: "active",
    originalPrincipal: Money.fromCents(100_000n),
    currentBalance: Money.fromCents(100_000n),
    startDate: new Date("2024-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    bankName: "Banco Teste",
    monthlyRate: rateMonthly(0.08),
    lastChargeDate: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  } as OverdraftDebt;
}

describe("DebtRepository (integration)", () => {
  it("creates and reads a financing debt by id", async () => {
    const entity = makeFinancing();
    const created = await repo.create(entity);
    expect(created.id).toBe(entity.id);
    expect(created.kind).toBe("financing");

    const found = await repo.findById(entity.id);
    expect(found).not.toBeNull();
    expect(found?.kind).toBe("financing");
    expect(found?.currentBalance.toCents()).toBe(5_000_000n);
    if (found?.kind === "financing") {
      expect(found.amortizationMethod).toBe("PRICE");
      expect(found.termMonths).toBe(60);
      expect(found.annualInterestRate.toDecimal()).toBeCloseTo(0.1, 10);
    }
  });

  it("lists all kinds for a user and filters by status", async () => {
    await repo.create(makeFinancing());
    await repo.create(makePersonalLoan());
    await repo.create(makeCreditCard());
    await repo.create(makeOverdraft({ status: "paid_off" }));

    const all = await repo.listForProfile(userId);
    expect(all).toHaveLength(4);
    const kinds = new Set(all.map((d) => d.kind));
    expect(kinds).toEqual(new Set(["financing", "personal_loan", "credit_card", "overdraft"]));

    const onlyActive = await repo.listForProfile(userId, { status: "active" });
    expect(onlyActive).toHaveLength(3);
    expect(onlyActive.every((d) => d.status === "active")).toBe(true);
  });

  it("updates a debt's label and balance", async () => {
    const entity = makeFinancing({ label: `${LABEL_PREFIX}financing-orig` });
    await repo.create(entity);

    const mutated: FinancingDebt = {
      ...entity,
      label: `${LABEL_PREFIX}financing-updated`,
      currentBalance: Money.fromCents(4_500_000n),
    };
    const updated = await repo.update(mutated);
    expect(updated.label).toBe(`${LABEL_PREFIX}financing-updated`);
    expect(updated.currentBalance.toCents()).toBe(4_500_000n);

    const reread = await repo.findById(entity.id);
    expect(reread?.label).toBe(`${LABEL_PREFIX}financing-updated`);
    expect(reread?.currentBalance.toCents()).toBe(4_500_000n);
  });

  it("setStatus transitions active -> paid_off", async () => {
    const entity = makeFinancing();
    await repo.create(entity);
    await repo.setStatus(entity.id, "paid_off");
    const after = await repo.findById(entity.id);
    expect(after?.status).toBe("paid_off");
  });

  it("round-trips credit_card with installmentPurchases via JSONB", async () => {
    const entity = makeCreditCard({
      installmentPurchases: [
        {
          description: "TV 4K",
          total: Money.fromCents(360_000n),
          installmentsTotal: 12,
          installmentsRemaining: 9,
          monthlyValue: Money.fromCents(30_000n),
        },
        {
          description: "Notebook",
          total: Money.fromCents(600_000n),
          installmentsTotal: 10,
          installmentsRemaining: 4,
          monthlyValue: Money.fromCents(60_000n),
        },
      ],
    });
    await repo.create(entity);

    const reread = await repo.findById(entity.id);
    expect(reread?.kind).toBe("credit_card");
    if (reread?.kind === "credit_card") {
      expect(reread.installmentPurchases).toHaveLength(2);
      const first = reread.installmentPurchases[0];
      expect(first?.description).toBe("TV 4K");
      expect(first?.total.toCents()).toBe(360_000n);
      expect(first?.installmentsTotal).toBe(12);
      expect(first?.installmentsRemaining).toBe(9);
      expect(first?.monthlyValue.toCents()).toBe(30_000n);
      const second = reread.installmentPurchases[1];
      expect(second?.description).toBe("Notebook");
      expect(second?.total.toCents()).toBe(600_000n);
      expect(second?.monthlyValue.toCents()).toBe(60_000n);
    }
  });
});
