import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";

import { closeDb, getDb } from "../client";

import { MonthClosingRepository } from "./month-closing.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-month-closing-user@saborfinanceiro.com.br";

const users = new UserRepository();
const repo = new MonthClosingRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from month_closings where user_id = ${userId}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from month_closings where user_id = ${userId}`);
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function makeClosing(overrides: Partial<MonthClosingEntity> = {}): MonthClosingEntity {
  return {
    userId,
    month: new Date("2026-01-01T00:00:00Z"),
    baselineNetWorthCents: 100_000n,
    endNetWorthCents: 150_000n,
    theoreticalFreeCashFlowCents: 60_000n,
    leakCents: 10_000n,
    closedAt: new Date("2026-02-01T00:00:00Z"),
    ...overrides,
  };
}

describe("MonthClosingRepository (integration)", () => {
  it("upsert inserts a closing and listForUser returns it", async () => {
    const closing = makeClosing();
    await repo.upsert(closing);

    const list = await repo.listForUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0]?.userId).toBe(userId);
    expect(list[0]?.baselineNetWorthCents).toBe(100_000n);
    expect(list[0]?.endNetWorthCents).toBe(150_000n);
    expect(list[0]?.theoreticalFreeCashFlowCents).toBe(60_000n);
    expect(list[0]?.leakCents).toBe(10_000n);
    expect(list[0]?.month).toBeInstanceOf(Date);
  });

  it("upsert is idempotent: same (userId, month) updates in place", async () => {
    await repo.upsert(makeClosing({ leakCents: 10_000n }));
    await repo.upsert(makeClosing({ leakCents: 99_000n, endNetWorthCents: 200_000n }));

    const list = await repo.listForUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0]?.leakCents).toBe(99_000n);
    expect(list[0]?.endNetWorthCents).toBe(200_000n);
  });

  it("latest returns the closing with the most recent month", async () => {
    await repo.upsert(makeClosing({ month: new Date("2026-01-01T00:00:00Z"), leakCents: 1_000n }));
    await repo.upsert(makeClosing({ month: new Date("2026-03-01T00:00:00Z"), leakCents: 3_000n }));
    await repo.upsert(makeClosing({ month: new Date("2026-02-01T00:00:00Z"), leakCents: 2_000n }));

    const latest = await repo.latest(userId);
    expect(latest?.leakCents).toBe(3_000n);
    expect(latest?.month.getTime()).toBe(new Date("2026-03-01T00:00:00Z").getTime());
  });

  it("listForUser orders results by month ascending", async () => {
    await repo.upsert(makeClosing({ month: new Date("2026-03-01T00:00:00Z"), leakCents: 3_000n }));
    await repo.upsert(makeClosing({ month: new Date("2026-01-01T00:00:00Z"), leakCents: 1_000n }));
    await repo.upsert(makeClosing({ month: new Date("2026-02-01T00:00:00Z"), leakCents: 2_000n }));

    const list = await repo.listForUser(userId);
    expect(list).toHaveLength(3);
    expect(list[0]?.leakCents).toBe(1_000n);
    expect(list[1]?.leakCents).toBe(2_000n);
    expect(list[2]?.leakCents).toBe(3_000n);
  });

  it("latest returns null when the user has no closings", async () => {
    const latest = await repo.latest(userId);
    expect(latest).toBeNull();
  });
});
