import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";

import { closeDb, getDb } from "../client";

import { DrizzleGoalRepository } from "./drizzle-goal.repository";
import { DrizzleUserRepository } from "./drizzle-user.repository";

const TEST_EMAIL = "it-test-goal-user@saborfinanceiro.com.br";

const users = new DrizzleUserRepository();
const repo = new DrizzleGoalRepository();
let userId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from goals where user_id = ${userId}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function makeGoal(overrides: Partial<Omit<GoalEntity, "createdAt" | "updatedAt">> = {}): Omit<
  GoalEntity,
  "createdAt" | "updatedAt"
> {
  return {
    id: randomUUID(),
    userId,
    type: "savings",
    title: "Reserva de emergencia",
    status: "active",
    targetCents: 1_000_000n,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: 6,
    fundingMode: "manual",
    manualSavedCents: 200_000n,
    monthlyCostCents: null,
    realReturnPct: null,
    ...overrides,
  };
}

describe("DrizzleGoalRepository (integration)", () => {
  it("creates and reads a goal by id", async () => {
    const entity = makeGoal();
    const created = await repo.create(entity);
    expect(created.id).toBe(entity.id);
    expect(created.type).toBe("savings");
    expect(created.status).toBe("active");
    expect(created.targetCents).toBe(1_000_000n);
    expect(created.manualSavedCents).toBe(200_000n);
    expect(created.targetMonths).toBe(6);
    expect(created.fundingMode).toBe("manual");

    const found = await repo.findById(entity.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(entity.id);
    expect(found?.title).toBe("Reserva de emergencia");
    expect(found?.realReturnPct).toBeNull();
  });

  it("findById returns null for soft-deleted goal", async () => {
    const entity = makeGoal();
    await repo.create(entity);
    await repo.softDelete(entity.id);
    const found = await repo.findById(entity.id);
    expect(found).toBeNull();
  });

  it("listForUser returns goals for user, excludes soft-deleted", async () => {
    const g1 = makeGoal({ id: randomUUID(), title: "Meta 1" });
    const g2 = makeGoal({ id: randomUUID(), title: "Meta 2", status: "reached" });
    const g3 = makeGoal({ id: randomUUID(), title: "Meta 3 deleted" });
    await repo.create(g1);
    await repo.create(g2);
    await repo.create(g3);
    await repo.softDelete(g3.id);

    const all = await repo.listForUser(userId);
    expect(all).toHaveLength(2);
    const ids = all.map((g) => g.id);
    expect(ids).toContain(g1.id);
    expect(ids).toContain(g2.id);
    expect(ids).not.toContain(g3.id);
  });

  it("listForUser filters by status", async () => {
    await repo.create(makeGoal({ id: randomUUID(), status: "active" }));
    await repo.create(makeGoal({ id: randomUUID(), status: "active" }));
    await repo.create(makeGoal({ id: randomUUID(), status: "reached" }));
    await repo.create(makeGoal({ id: randomUUID(), status: "archived" }));

    const active = await repo.listForUser(userId, { status: "active" });
    expect(active).toHaveLength(2);
    expect(active.every((g) => g.status === "active")).toBe(true);

    const reached = await repo.listForUser(userId, { status: "reached" });
    expect(reached).toHaveLength(1);
    expect(reached[0]?.status).toBe("reached");
  });

  it("countActive counts only active non-deleted goals", async () => {
    await repo.create(makeGoal({ id: randomUUID(), status: "active" }));
    await repo.create(makeGoal({ id: randomUUID(), status: "active" }));
    await repo.create(makeGoal({ id: randomUUID(), status: "reached" }));
    const toDelete = makeGoal({ id: randomUUID(), status: "active" });
    await repo.create(toDelete);
    await repo.softDelete(toDelete.id);

    const c = await repo.countActive(userId);
    expect(c).toBe(2);
  });

  it("update patches selected fields and bumps updatedAt", async () => {
    const entity = makeGoal();
    const created = await repo.create(entity);

    const updated = await repo.update(entity.id, {
      title: "Reserva atualizada",
      targetCents: 2_000_000n,
      realReturnPct: 5.5,
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Reserva atualizada");
    expect(updated?.targetCents).toBe(2_000_000n);
    expect(updated?.realReturnPct).toBeCloseTo(5.5);
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });

  it("update returns null for unknown id", async () => {
    const result = await repo.update(randomUUID(), { title: "Ghost" });
    expect(result).toBeNull();
  });

  it("listAllActive returns active goals across all users", async () => {
    const g1 = makeGoal({ id: randomUUID(), status: "active" });
    const g2 = makeGoal({ id: randomUUID(), status: "archived" });
    const g3 = makeGoal({ id: randomUUID(), status: "active" });
    const g4 = makeGoal({ id: randomUUID(), status: "active" });
    await repo.create(g1);
    await repo.create(g2);
    await repo.create(g3);
    await repo.softDelete(g3.id);
    await repo.create(g4);

    const allActive = await repo.listAllActive();
    const ownActiveIds = allActive.filter((g) => g.userId === userId).map((g) => g.id);
    expect(ownActiveIds).toContain(g1.id);
    expect(ownActiveIds).not.toContain(g2.id);
    expect(ownActiveIds).not.toContain(g3.id);
    expect(ownActiveIds).toContain(g4.id);
    expect(allActive.every((g) => g.status === "active")).toBe(true);
  });

  it("round-trips realReturnPct and all nullable bigint fields", async () => {
    const entity = makeGoal({
      type: "financial_independence",
      fundingMode: "linked",
      targetCents: null,
      manualSavedCents: null,
      monthlyCostCents: 500_000n,
      realReturnPct: 8.75,
      deadline: new Date("2040-01-01T00:00:00Z"),
    });
    const created = await repo.create(entity);

    expect(created.targetCents).toBeNull();
    expect(created.manualSavedCents).toBeNull();
    expect(created.monthlyCostCents).toBe(500_000n);
    expect(created.realReturnPct).toBeCloseTo(8.75);
    expect(created.fundingMode).toBe("linked");
    expect(created.deadline).toBeInstanceOf(Date);
  });
});
