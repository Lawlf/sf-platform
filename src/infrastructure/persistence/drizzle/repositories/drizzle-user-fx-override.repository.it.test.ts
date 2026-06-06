import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { DrizzleUserFxOverrideRepository } from "./drizzle-user-fx-override.repository";
import { DrizzleUserRepository } from "./drizzle-user.repository";

const TEST_EMAIL = "it-test-user-fx-override-user@saborfinanceiro.com.br";

const users = new DrizzleUserRepository();
const repo = new DrizzleUserFxOverrideRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

describe("DrizzleUserFxOverrideRepository (integration)", () => {
  it("upsert then find round-trips the override", async () => {
    await repo.upsert({
      userId,
      fromCurrency: "USD",
      toCurrency: "BRL",
      rateDecimal: "5.1234",
    });

    const found = await repo.find(userId, "USD", "BRL");
    expect(found).not.toBeNull();
    expect(found?.userId).toBe(userId);
    expect(found?.fromCurrency).toBe("USD");
    expect(found?.toCurrency).toBe("BRL");
    expect(found?.rateDecimal).toBe("5.1234");
  });

  it("a second upsert on the same pair updates the rate", async () => {
    await repo.upsert({
      userId,
      fromCurrency: "EUR",
      toCurrency: "BRL",
      rateDecimal: "6.0000",
    });
    const updated = await repo.upsert({
      userId,
      fromCurrency: "EUR",
      toCurrency: "BRL",
      rateDecimal: "6.5000",
    });
    expect(updated.rateDecimal).toBe("6.5000");

    const found = await repo.find(userId, "EUR", "BRL");
    expect(found?.rateDecimal).toBe("6.5000");
  });

  it("remove deletes the override", async () => {
    await repo.upsert({
      userId,
      fromCurrency: "GBP",
      toCurrency: "BRL",
      rateDecimal: "7.0000",
    });

    await repo.remove(userId, "GBP", "BRL");
    const found = await repo.find(userId, "GBP", "BRL");
    expect(found).toBeNull();
  });

  it("listForUser returns all overrides for the user", async () => {
    await repo.upsert({
      userId,
      fromCurrency: "USD",
      toCurrency: "BRL",
      rateDecimal: "5.1234",
    });
    await repo.upsert({
      userId,
      fromCurrency: "EUR",
      toCurrency: "BRL",
      rateDecimal: "6.5000",
    });

    const all = await repo.listForUser(userId);
    expect(all.length).toBeGreaterThanOrEqual(2);
    const pairs = all.map((o) => `${o.fromCurrency}/${o.toCurrency}`);
    expect(pairs).toContain("USD/BRL");
    expect(pairs).toContain("EUR/BRL");
  });
});
