import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { RecurringDebt } from "@/domain/entities/debt.entity";
import type { RecurringSettlementEntity } from "@/domain/entities/recurring-settlement.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { closeDb, getDb } from "../client";

import { DebtRepository } from "./debt.repository";
import { RecurringSettlementRepository } from "./recurring-settlement.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-recurring-settlement-user@saborfinanceiro.com.br";
const LABEL_PREFIX = "it-test-recurring-settlement-";

const users = new UserRepository();
const debts = new DebtRepository();
const repo = new RecurringSettlementRepository();

let userId: string;
let debtId: string;

function makeRecurringDebt(id: string, label: string): RecurringDebt {
  return {
    id,
    userId,
    label,
    kind: "recurring",
    status: "active",
    originalPrincipal: Money.fromCents(50_000n),
    currentBalance: Money.zero(),
    startDate: new Date("2026-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    recurringFrequency: "monthly",
    recurringAmountCents: 50_000n,
    expenseCategory: "subscriptions",
    dueDay: null,
  };
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;

  debtId = randomUUID();
  await debts.create(makeRecurringDebt(debtId, `${LABEL_PREFIX}commitment`));
});

afterEach(async () => {
  await getDb().execute(sql`delete from recurring_settlements where user_id = ${userId}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from recurring_settlements where user_id = ${userId}`);
  await getDb().execute(sql`delete from debts where label like ${LABEL_PREFIX + "%"}`);
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function makeSettlement(
  overrides: Partial<RecurringSettlementEntity> = {},
): RecurringSettlementEntity {
  return {
    userId,
    debtId,
    month: new Date("2026-03-01T00:00:00Z"),
    status: "converted_to_debt",
    createdDebtId: null,
    createdAt: new Date("2026-04-01T00:00:00Z"),
    ...overrides,
  };
}

describe("RecurringSettlementRepository (integration)", () => {
  it("upsert inserts and listForUser returns it", async () => {
    await repo.upsert(makeSettlement());

    const list = await repo.listForUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0]?.userId).toBe(userId);
    expect(list[0]?.debtId).toBe(debtId);
    expect(list[0]?.status).toBe("converted_to_debt");
    expect(list[0]?.month).toBeInstanceOf(Date);
  });

  it("upsert is idempotent on (userId, debtId, month) and updates in place", async () => {
    await repo.upsert(makeSettlement({ status: "converted_to_debt", createdDebtId: null }));
    const createdDebtId = randomUUID();
    await debts.create(makeRecurringDebt(createdDebtId, `${LABEL_PREFIX}created`));
    await repo.upsert(makeSettlement({ status: "cancelled", createdDebtId }));

    const list = await repo.listForUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0]?.status).toBe("cancelled");
    expect(list[0]?.createdDebtId).toBe(createdDebtId);
  });

  it("listForUserMonth returns only settlements of that month", async () => {
    await repo.upsert(makeSettlement({ month: new Date("2026-03-01T00:00:00Z") }));
    await repo.upsert(makeSettlement({ month: new Date("2026-04-01T00:00:00Z") }));

    const march = await repo.listForUserMonth(userId, new Date("2026-03-01T00:00:00Z"));
    expect(march).toHaveLength(1);
    expect(march[0]?.month.getTime()).toBe(new Date("2026-03-01T00:00:00Z").getTime());
  });

  it("listForUser returns empty when the user has no settlements", async () => {
    const list = await repo.listForUser(userId);
    expect(list).toHaveLength(0);
  });
});
