import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { DrizzleSessionRepository } from "./drizzle-session.repository";
import { DrizzleUserRepository } from "./drizzle-user.repository";

const users = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({
    email: "it-test-session-user@saborfinanceiro.com.br",
    emailVerified: true,
  });
  userId = u.id;
});

afterAll(async () => {
  await getDb().execute(
    sql`delete from users where email = 'it-test-session-user@saborfinanceiro.com.br'`,
  );
  await closeDb();
});

describe("DrizzleSessionRepository (integration)", () => {
  it("creates, reads, and deletes a session", async () => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const s = await sessionRepo.create({
      idHash: "0".repeat(64),
      userId,
      expiresAt,
      ip: "127.0.0.1",
      userAgent: "vitest",
    });
    expect(s.idHash).toBe("0".repeat(64));

    const found = await sessionRepo.findByIdHash("0".repeat(64));
    expect(found?.userId).toBe(userId);

    await sessionRepo.delete("0".repeat(64));
    expect(await sessionRepo.findByIdHash("0".repeat(64))).toBeNull();
  });

  it("touch updates expiresAt and lastUsedAt", async () => {
    const idHash = "1".repeat(64);
    const expires = new Date(Date.now() + 60_000);
    await sessionRepo.create({ idHash, userId, expiresAt: expires, ip: null, userAgent: null });
    const newExpires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const now = new Date();
    await sessionRepo.touch(idHash, newExpires, now);
    const after = await sessionRepo.findByIdHash(idHash);
    expect(after?.expiresAt.getTime()).toBeCloseTo(newExpires.getTime(), -3);
    expect(after?.lastUsedAt.getTime()).toBeCloseTo(now.getTime(), -3);
    await sessionRepo.delete(idHash);
  });

  it("listActiveForUser excludes expired sessions", async () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60_000);
    await sessionRepo.create({
      idHash: "2".repeat(64),
      userId,
      expiresAt: past,
      ip: null,
      userAgent: null,
    });
    await sessionRepo.create({
      idHash: "3".repeat(64),
      userId,
      expiresAt: future,
      ip: null,
      userAgent: null,
    });
    const active = await sessionRepo.listActiveForUser(userId);
    expect(active.find((x) => x.idHash === "2".repeat(64))).toBeUndefined();
    expect(active.find((x) => x.idHash === "3".repeat(64))).toBeDefined();
    await sessionRepo.deleteAllForUser(userId);
  });

  it("deleteExpired removes only sessions past their expiry", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 60_000);
    const future = new Date(now.getTime() + 60_000);
    await sessionRepo.create({
      idHash: "4".repeat(64),
      userId,
      expiresAt: past,
      ip: null,
      userAgent: null,
    });
    await sessionRepo.create({
      idHash: "5".repeat(64),
      userId,
      expiresAt: future,
      ip: null,
      userAgent: null,
    });
    const removed = await sessionRepo.deleteExpired(now);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await sessionRepo.findByIdHash("4".repeat(64))).toBeNull();
    expect(await sessionRepo.findByIdHash("5".repeat(64))).not.toBeNull();
    await sessionRepo.deleteAllForUser(userId);
  });
});
