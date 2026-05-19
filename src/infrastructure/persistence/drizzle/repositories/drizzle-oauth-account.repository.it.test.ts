import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { DrizzleOauthAccountRepository } from "./drizzle-oauth-account.repository";
import { DrizzleUserRepository } from "./drizzle-user.repository";

const users = new DrizzleUserRepository();
const repo = new DrizzleOauthAccountRepository();
const TEST_EMAIL = "it-test-oauth@saborfinanceiro.com.br";
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

describe("DrizzleOauthAccountRepository (integration)", () => {
  it("creates and finds by provider + providerUserId", async () => {
    const created = await repo.create({
      userId,
      provider: "google",
      providerUserId: "google-1234",
    });
    expect(created.userId).toBe(userId);
    const found = await repo.findByProviderAndId("google", "google-1234");
    expect(found?.id).toBe(created.id);
  });

  it("listForUser returns all accounts of the user", async () => {
    await repo.create({ userId, provider: "apple", providerUserId: "apple-9999" });
    const all = await repo.listForUser(userId);
    expect(all.length).toBeGreaterThanOrEqual(2);
    const providers = all.map((a) => a.provider).sort();
    expect(providers).toContain("google");
    expect(providers).toContain("apple");
  });

  it("returns null when not found", async () => {
    expect(await repo.findByProviderAndId("google", "nope")).toBeNull();
  });
});
