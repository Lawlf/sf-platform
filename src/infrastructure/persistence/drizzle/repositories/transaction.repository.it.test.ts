import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { closeDb, getDb } from "../client";

import { ProfileRepository } from "./profile.repository";
import { TransactionRepository } from "./transaction.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-transaction-user@saborfinanceiro.com.br";
const DESC_PREFIX = "it-test-transaction-";

const users = new UserRepository();
const profiles = new ProfileRepository();
const repo = new TransactionRepository();
let userId: string;
let profileId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
  const profile = await profiles.ensurePfProfile(userId, new Date());
  profileId = profile.id;
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
    profileId,
    direction: "out" as const,
    occurredAt: new Date("2026-06-15T00:00:00Z"),
    amount: Money.fromCents(4000n),
    description: `${DESC_PREFIX}café`,
    category: "alimentação",
    accountId: null,
    assetId: null,
    status: "paid" as const,
    excludedFromTotals: false,
    source: "manual" as const,
    externalId: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("TransactionRepository (integration)", () => {
  it("creates a transaction and lists it within range", async () => {
    const entity = makeTransaction();
    const created = await repo.create(entity);
    expect(created.id).toBe(entity.id);
    expect(created.amount.toCents()).toBe(4000n);
    expect(created.description).toBe(`${DESC_PREFIX}café`);
    expect(created.category).toBe("alimentação");

    const found = await repo.listForProfileInRange(
      profileId,
      new Date("2026-06-01T00:00:00Z"),
      new Date("2026-06-30T23:59:59Z"),
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe(entity.id);
    expect(found[0]?.amount.toCents()).toBe(4000n);
  });

  it("excludes transactions outside the requested range", async () => {
    await repo.create(makeTransaction({ occurredAt: new Date("2026-03-10T00:00:00Z") }));

    const found = await repo.listForProfileInRange(
      profileId,
      new Date("2026-06-01T00:00:00Z"),
      new Date("2026-06-30T23:59:59Z"),
    );
    expect(found).toHaveLength(0);
  });

  it("excludes soft-deleted transactions", async () => {
    await repo.create(makeTransaction({ deletedAt: new Date("2026-06-16T00:00:00Z") }));

    const found = await repo.listForProfileInRange(
      profileId,
      new Date("2026-06-01T00:00:00Z"),
      new Date("2026-06-30T23:59:59Z"),
    );
    expect(found).toHaveLength(0);
  });

  it("existingExternalIds returns only ids already stored for the user", async () => {
    await repo.create(
      makeTransaction({
        description: `${DESC_PREFIX}ofx-A1`,
        externalId: "A1",
        source: "ofx_import",
      }),
    );

    const hits = await repo.existingExternalIds(profileId, ["A1", "NOPE"]);
    expect(hits).toEqual(["A1"]);

    const empty = await repo.existingExternalIds(profileId, []);
    expect(empty).toEqual([]);
  });
});
