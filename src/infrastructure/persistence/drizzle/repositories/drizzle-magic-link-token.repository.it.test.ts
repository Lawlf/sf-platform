import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { DrizzleMagicLinkTokenRepository } from "./drizzle-magic-link-token.repository";
import { DrizzleUserRepository } from "./drizzle-user.repository";

const users = new DrizzleUserRepository();
const tokens = new DrizzleMagicLinkTokenRepository();
const TEST_EMAIL = "it-test-mlt@saborfinanceiro.com.br";
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from magic_link_tokens where email = ${TEST_EMAIL}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

describe("DrizzleMagicLinkTokenRepository (integration)", () => {
  it("creates and finds by tokenHash", async () => {
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const created = await tokens.create({
      tokenHash: "a".repeat(64),
      code: "123456",
      email: TEST_EMAIL,
      userId,
      expiresAt,
    });
    expect(created.tokenHash).toBe("a".repeat(64));
    expect(created.code).toBe("123456");
    expect(created.attemptCount).toBe(0);
    expect(created.usedAt).toBeNull();

    const found = await tokens.findByTokenHash("a".repeat(64));
    expect(found?.email).toBe(TEST_EMAIL);
  });

  it("findActiveByEmail returns latest unused unexpired", async () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 15 * 60_000);
    await tokens.create({
      tokenHash: "b".repeat(64),
      code: "111111",
      email: TEST_EMAIL,
      userId,
      expiresAt: past,
    });
    await tokens.create({
      tokenHash: "c".repeat(64),
      code: "222222",
      email: TEST_EMAIL,
      userId,
      expiresAt: future,
    });
    const active = await tokens.findActiveByEmail(TEST_EMAIL);
    expect(active?.tokenHash).toBe("c".repeat(64));
  });

  it("markUsed sets usedAt", async () => {
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await tokens.create({
      tokenHash: "d".repeat(64),
      code: "333333",
      email: TEST_EMAIL,
      userId,
      expiresAt,
    });
    await tokens.markUsed("d".repeat(64));
    const after = await tokens.findByTokenHash("d".repeat(64));
    expect(after?.usedAt).toBeInstanceOf(Date);
  });

  it("incrementAttempts returns new count", async () => {
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await tokens.create({
      tokenHash: "e".repeat(64),
      code: "444444",
      email: TEST_EMAIL,
      userId,
      expiresAt,
    });
    expect(await tokens.incrementAttempts("e".repeat(64))).toBe(1);
    expect(await tokens.incrementAttempts("e".repeat(64))).toBe(2);
    expect(await tokens.incrementAttempts("e".repeat(64))).toBe(3);
  });

  it("deleteExpired removes expired tokens only", async () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60_000);
    await tokens.create({
      tokenHash: "f".repeat(64),
      code: "555555",
      email: TEST_EMAIL,
      userId,
      expiresAt: past,
    });
    await tokens.create({
      tokenHash: "9".repeat(64),
      code: "666666",
      email: TEST_EMAIL,
      userId,
      expiresAt: future,
    });
    const removed = await tokens.deleteExpired(new Date());
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await tokens.findByTokenHash("f".repeat(64))).toBeNull();
    expect(await tokens.findByTokenHash("9".repeat(64))).not.toBeNull();
  });
});
