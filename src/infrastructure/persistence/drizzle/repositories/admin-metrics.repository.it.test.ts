import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../client";

import { AdminMetricsRepository } from "./admin-metrics.repository";
import { UserRepository } from "./user.repository";


const EMAIL = "it-admin-metrics@saborfinanceiro.com.br";
const users = new UserRepository();
const repo = new AdminMetricsRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: EMAIL, emailVerified: true });
  userId = u.id;
  await getDb().execute(sql`
    insert into payments (user_id, provider, amount_cents, currency, status, payment_method, paid_at)
    values (${userId}, 'manual', 1000::bigint, 'BRL', 'succeeded', 'manual', now())
  `);
});

afterAll(async () => {
  await getDb().execute(sql`delete from payments where user_id = ${userId}`);
  await getDb().execute(sql`delete from users where email = ${EMAIL}`);
  await closeDb();
});

describe("AdminMetricsRepository (integration)", () => {
  it("getSummary returns non-negative totals and a valid conversion rate", async () => {
    const s = await repo.getSummary(new Date());
    expect(s.revenueTotalCents).toBeGreaterThanOrEqual(1000n);
    expect(s.conversionRate).toBeGreaterThanOrEqual(0);
    expect(s.conversionRate).toBeLessThanOrEqual(1);
    expect(s.freeCount).toBeGreaterThanOrEqual(1);
  });

  it("getRevenueSeries includes today's payment", async () => {
    const series = await repo.getRevenueSeries(new Date(), 7);
    const total = series.reduce((acc, p) => acc + p.value, 0);
    expect(total).toBeGreaterThanOrEqual(1000);
  });

  it("listRecentPayments returns the seeded payment", async () => {
    const list = await repo.listRecentPayments(50);
    expect(list.some((p) => p.userId === userId)).toBe(true);
  });
});
