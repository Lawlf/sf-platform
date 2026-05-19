import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { FinancingDebt } from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors";

import { closeDb, getDb } from "../client";

import { DrizzleDebtPaymentRepository } from "./drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "./drizzle-debt.repository";
import { DrizzleUserRepository } from "./drizzle-user.repository";

const TEST_EMAIL = "it-test-payment-user@saborfinanceiro.com.br";
const LABEL_PREFIX = "it-test-payment-";

const users = new DrizzleUserRepository();
const debts = new DrizzleDebtRepository();
const repo = new DrizzleDebtPaymentRepository();

let userId: string;
let debtId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;

  const annual = InterestRate.fromAnnual(0.1);
  if (!isOk(annual)) throw new Error("rate fixture");
  const debt: FinancingDebt = {
    id: randomUUID(),
    userId,
    label: `${LABEL_PREFIX}financing`,
    kind: "financing",
    status: "active",
    originalPrincipal: Money.fromCents(1_000_000n),
    currentBalance: Money.fromCents(1_000_000n),
    startDate: new Date("2024-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    amortizationMethod: "PRICE",
    annualInterestRate: annual.value,
    termMonths: 24,
    monthlyInsurance: null,
    monthlyAdminFee: null,
  };
  await debts.create(debt);
  debtId = debt.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from debt_payments where debt_id = ${debtId}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from debts where label like ${LABEL_PREFIX + "%"}`);
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function makePayment(overrides: Partial<DebtPaymentEntity> = {}): DebtPaymentEntity {
  return {
    id: randomUUID(),
    debtId,
    paidAt: new Date("2024-02-01T00:00:00Z"),
    amount: Money.fromCents(50_000n),
    principalPortion: Money.fromCents(40_000n),
    interestPortion: Money.fromCents(10_000n),
    isExtra: false,
    ...overrides,
  };
}

describe("DrizzleDebtPaymentRepository (integration)", () => {
  it("creates payments and lists them ordered by paidAt ascending", async () => {
    const second = makePayment({ paidAt: new Date("2024-03-01T00:00:00Z") });
    const first = makePayment({ paidAt: new Date("2024-02-01T00:00:00Z") });
    // Insert in reverse order to confirm DB ordering, not insert order.
    await repo.create(second);
    await repo.create(first);

    const list = await repo.listForDebt(debtId);
    expect(list).toHaveLength(2);
    expect(list[0]?.paidAt.getTime()).toBe(first.paidAt.getTime());
    expect(list[1]?.paidAt.getTime()).toBe(second.paidAt.getTime());
    expect(list[0]?.amount.toCents()).toBe(50_000n);
    expect(list[0]?.principalPortion.toCents()).toBe(40_000n);
    expect(list[0]?.interestPortion.toCents()).toBe(10_000n);
  });

  it("round-trips isExtra true", async () => {
    const extra = makePayment({ isExtra: true });
    const regular = makePayment({
      isExtra: false,
      paidAt: new Date("2024-04-01T00:00:00Z"),
    });
    await repo.create(extra);
    await repo.create(regular);

    const list = await repo.listForDebt(debtId);
    expect(list).toHaveLength(2);
    const byId = new Map(list.map((p) => [p.id, p]));
    expect(byId.get(extra.id)?.isExtra).toBe(true);
    expect(byId.get(regular.id)?.isExtra).toBe(false);
  });
});
