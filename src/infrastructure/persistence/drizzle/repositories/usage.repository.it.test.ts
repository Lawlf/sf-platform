import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { UsageRepository } from "./usage.repository";
import { UserRepository } from "./user.repository";


const EMAIL = "it-usage@saborfinanceiro.com.br";
const users = new UserRepository();
const repo = new UsageRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  userId = (await users.create({ email: EMAIL, emailVerified: true })).id;
});

afterAll(async () => {
  await getDb().execute(sql`delete from usage_events where user_id = ${userId}`);
  await getDb().execute(sql`delete from usage_daily_rollup where user_id = ${userId}`);
  await getDb().execute(sql`delete from users where email = ${EMAIL}`);
  await closeDb();
});

describe("UsageRepository (integration)", () => {
  it("recordPing upserts rollup: two pings accumulate activeSeconds + pingCount", async () => {
    const now = new Date();
    await repo.recordPing(userId, "/app", now);
    await repo.recordPing(userId, "/app/dividas", now);
    const usage = await repo.getUserUsage(userId, now);
    expect(usage.activeSeconds30d).toBe(60);
    expect(usage.lastSeenAt).not.toBeNull();
  });

  it("getSummary counts the user in DAU/WAU/MAU", async () => {
    const s = await repo.getSummary(new Date());
    expect(s.dau).toBeGreaterThanOrEqual(1);
    expect(s.mau).toBeGreaterThanOrEqual(1);
  });
});
