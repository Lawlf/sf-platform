import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { closeDb, getDb } from "../client";

import { IncomeRepository } from "./income.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-income-user@saborfinanceiro.com.br";
const LABEL_PREFIX = "it-test-income-";

const users = new UserRepository();
const repo = new IncomeRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from incomes where label like ${LABEL_PREFIX + "%"}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function makeIncome(overrides: Partial<IncomeEntity> = {}): IncomeEntity {
  return {
    id: randomUUID(),
    userId,
    label: `${LABEL_PREFIX}salario`,
    amount: Money.fromCents(500_000n),
    frequency: "monthly",
    startDate: new Date("2024-01-01T00:00:00Z"),
    paymentDay: null,
    endDate: null,
    isEstimated: false,
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

describe("IncomeRepository (integration)", () => {
  it("creates and reads an income by id", async () => {
    const entity = makeIncome();
    const created = await repo.create(entity);
    expect(created.id).toBe(entity.id);
    expect(created.amount.toCents()).toBe(500_000n);
    expect(created.frequency).toBe("monthly");

    const found = await repo.findById(entity.id);
    expect(found).not.toBeNull();
    expect(found?.label).toBe(`${LABEL_PREFIX}salario`);
    expect(found?.amount.toCents()).toBe(500_000n);
    expect(found?.isActive).toBe(true);
  });

  it("listForUser onlyActive returns only active incomes", async () => {
    await repo.create(makeIncome({ label: `${LABEL_PREFIX}active`, isActive: true }));
    await repo.create(makeIncome({ label: `${LABEL_PREFIX}inactive`, isActive: false }));

    const all = await repo.listForUser(userId);
    expect(all).toHaveLength(2);

    const onlyActive = await repo.listForUser(userId, { onlyActive: true });
    expect(onlyActive).toHaveLength(1);
    expect(onlyActive[0]?.label).toBe(`${LABEL_PREFIX}active`);
    expect(onlyActive[0]?.isActive).toBe(true);
  });

  it("round-trips a non-BRL income currency", async () => {
    const entity = makeIncome({
      label: `${LABEL_PREFIX}usd`,
      amount: Money.fromCents(500_000n, "USD"),
    });
    const created = await repo.create(entity);
    expect(created.amount.currency).toBe("USD");

    const found = await repo.findById(entity.id);
    expect(found?.amount.currency).toBe("USD");
    expect(found?.amount.toCents()).toBe(500_000n);
  });

  it("setActive toggles the isActive flag", async () => {
    const entity = makeIncome();
    await repo.create(entity);

    await repo.setActive(entity.id, false);
    let after = await repo.findById(entity.id);
    expect(after?.isActive).toBe(false);

    await repo.setActive(entity.id, true);
    after = await repo.findById(entity.id);
    expect(after?.isActive).toBe(true);
  });
});
