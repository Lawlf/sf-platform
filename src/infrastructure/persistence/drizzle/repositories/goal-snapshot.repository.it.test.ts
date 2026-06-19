import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { GoalSnapshotEntity } from "@/domain/entities/goal-snapshot.entity";

import { closeDb, getDb } from "../client";

import { GoalSnapshotRepository } from "./goal-snapshot.repository";
import { GoalRepository } from "./goal.repository";
import { ProfileRepository } from "./profile.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-goal-snapshot-user@saborfinanceiro.com.br";

const users = new UserRepository();
const profiles = new ProfileRepository();
const goalRepo = new GoalRepository();
const repo = new GoalSnapshotRepository();
let userId: string;
let profileId: string;
let goalId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
  const profile = await profiles.ensurePfProfile(userId, new Date());
  profileId = profile.id;

  const goal = await goalRepo.create({
    id: randomUUID(),
    userId,
    profileId,
    householdId: null,
    type: "savings",
    title: "Meta snapshot test",
    status: "active",
    targetCents: 1_000_000n,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: null,
    fundingMode: null,
    manualSavedCents: null,
    monthlyCostCents: null,
    realReturnPct: null,
    cascadeOrder: null,
    cascadeMode: null,
    cascadeParallelPct: null,
  });
  goalId = goal.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from goal_snapshots where goal_id = ${goalId}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from goals where user_id = ${userId}`);
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function makeSnapshot(overrides: Partial<GoalSnapshotEntity> = {}): GoalSnapshotEntity {
  return {
    goalId,
    month: new Date("2026-01-01T00:00:00Z"),
    currentCents: 200_000n,
    targetCents: 1_000_000n,
    capturedAt: new Date("2026-01-31T00:00:00Z"),
    ...overrides,
  };
}

describe("GoalSnapshotRepository (integration)", () => {
  it("upsert inserts a snapshot and listForGoal returns it", async () => {
    const snap = makeSnapshot();
    await repo.upsert(snap);

    const list = await repo.listForGoal(goalId);
    expect(list).toHaveLength(1);
    expect(list[0]?.goalId).toBe(goalId);
    expect(list[0]?.currentCents).toBe(200_000n);
    expect(list[0]?.targetCents).toBe(1_000_000n);
    expect(list[0]?.month).toBeInstanceOf(Date);
  });

  it("upsert is idempotent: same (goalId, month) results in one row with updated values", async () => {
    const snap = makeSnapshot({ currentCents: 100_000n });
    await repo.upsert(snap);

    const updated = makeSnapshot({ currentCents: 350_000n, capturedAt: new Date("2026-01-31T12:00:00Z") });
    await repo.upsert(updated);

    const list = await repo.listForGoal(goalId);
    expect(list).toHaveLength(1);
    expect(list[0]?.currentCents).toBe(350_000n);
  });

  it("listForGoal orders results by month ascending", async () => {
    await repo.upsert(makeSnapshot({ month: new Date("2026-03-01T00:00:00Z"), currentCents: 300_000n }));
    await repo.upsert(makeSnapshot({ month: new Date("2026-01-01T00:00:00Z"), currentCents: 100_000n }));
    await repo.upsert(makeSnapshot({ month: new Date("2026-02-01T00:00:00Z"), currentCents: 200_000n }));

    const list = await repo.listForGoal(goalId);
    expect(list).toHaveLength(3);
    expect(list[0]?.currentCents).toBe(100_000n);
    expect(list[1]?.currentCents).toBe(200_000n);
    expect(list[2]?.currentCents).toBe(300_000n);

    const months = list.map((s) => s.month.getTime());
    expect(months[0]).toBeLessThan(months[1]!);
    expect(months[1]).toBeLessThan(months[2]!);
  });

  it("listForGoal returns empty array when no snapshots exist", async () => {
    const other = await goalRepo.create({
      id: randomUUID(),
      userId,
      profileId,
      householdId: null,
      type: "emergency_fund",
      title: "Fundo emergencia",
      status: "active",
      targetCents: 500_000n,
      deadline: null,
      linkedDebtId: null,
      linkedAssetId: null,
      targetMonths: null,
      fundingMode: null,
      manualSavedCents: null,
      monthlyCostCents: null,
      realReturnPct: null,
      cascadeOrder: null,
      cascadeMode: null,
      cascadeParallelPct: null,
    });

    const list = await repo.listForGoal(other.id);
    expect(list).toHaveLength(0);

    await getDb().execute(sql`delete from goals where id = ${other.id}`);
  });
});
