import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { closeDb, getDb } from "../client";

import { DrizzleTransactionRepository } from "./drizzle-transaction.repository";
import { DrizzleUserRepository } from "./drizzle-user.repository";

const TEST_EMAIL = "it-test-transaction-user@saborfinanceiro.com.br";
const DESC_PREFIX = "it-test-transaction-";

const users = new DrizzleUserRepository();
const repo = new DrizzleTransactionRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from transactions where description like ${DESC_PREFIX + "%"}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function makeTransaction(
  overrides: Partial<Omit<TransactionEntity, "createdAt">> = {},
): Omit<TransactionEntity, "createdAt"> {
  return {
    id: randomUUID(),
    userId,
    direction: "out" as const,
    occurredAt: new Date("2026-06-15T00:00:00Z"),
    amount: Money.fromCents(4000n),
    description: `${DESC_PREFIX}café`,
    category: "alimentação",
    accountId: null,
    status: "paid" as const,
    source: "manual" as const,
    externalId: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("DrizzleTransactionRepository (integration)", () => {
  it("creates a transaction and lists it within range", async () => {
    const entity = makeTransaction();
    const created = await repo.create(entity);
    expect(created.id).toBe(entity.id);
    expect(created.amount.toCents()).toBe(4000n);
    expect(created.description).toBe(`${DESC_PREFIX}café`);
    expect(created.category).toBe("alimentação");

    const found = await repo.listForUserInRange(
      userId,
      new Date("2026-06-01T00:00:00Z"),
      new Date("2026-06-30T23:59:59Z"),
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe(entity.id);
    expect(found[0]?.amount.toCents()).toBe(4000n);
  });

  it("excludes transactions outside the requested range", async () => {
    await repo.create(makeTransaction({ occurredAt: new Date("2026-03-10T00:00:00Z") }));

    const found = await repo.listForUserInRange(
      userId,
      new Date("2026-06-01T00:00:00Z"),
      new Date("2026-06-30T23:59:59Z"),
    );
    expect(found).toHaveLength(0);
  });

  it("excludes soft-deleted transactions", async () => {
    await repo.create(makeTransaction({ deletedAt: new Date("2026-06-16T00:00:00Z") }));

    const found = await repo.listForUserInRange(
      userId,
      new Date("2026-06-01T00:00:00Z"),
      new Date("2026-06-30T23:59:59Z"),
    );
    expect(found).toHaveLength(0);
  });
});
