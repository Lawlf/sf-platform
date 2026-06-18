import { describe, expect, it } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";

import { updateGoalCascadeConfig } from "./update-goal-cascade-config.use-case";

function makeGoal(overrides: Partial<GoalEntity> = {}): GoalEntity {
  return {
    id: "g1",
    userId: "u1",
    profileId: "profile-1",
    type: "savings",
    title: "Meta",
    status: "active",
    targetCents: null,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeGoalsRepo(initial: GoalEntity[]): GoalRepositoryPort {
  const store = new Map<string, GoalEntity>(initial.map((g) => [g.id, g]));
  return {
    findById: async (id: string) => store.get(id) ?? null,
    update: async (id: string, patch: Partial<GoalEntity>) => {
      const existing = store.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch, updatedAt: new Date() };
      store.set(id, updated);
      return updated;
    },
    create: async () => { throw new Error("not used"); },
    listForProfile: async () => { throw new Error("not used"); },
    countActive: async () => { throw new Error("not used"); },
    softDelete: async () => { throw new Error("not used"); },
    restore: async () => { throw new Error("not used"); },
    listAllActive: async () => { throw new Error("not used"); },
  } as unknown as GoalRepositoryPort;
}

const goals = makeGoalsRepo([makeGoal()]);

describe("updateGoalCascadeConfig", () => {
  it("rejects Free users", async () => {
    const res = await updateGoalCascadeConfig(
      { goals },
      { userId: "u1", profileId: "profile-1", goalId: "g1", isPro: false, mode: "parallel", order: 2, parallelFraction: 0.3 },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/Pro/);
    const after = await goals.findById("g1");
    expect(after?.cascadeMode).toBeNull();
  });

  it("rejects when the goal is not owned by the user", async () => {
    const res = await updateGoalCascadeConfig(
      { goals },
      { userId: "someone-else", profileId: "profile-2", goalId: "g1", isPro: true, mode: "queue", order: 1, parallelFraction: 0 },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe("Meta não encontrada.");
  });

  it("writes the three cascade fields for a Pro owner", async () => {
    const res = await updateGoalCascadeConfig(
      { goals },
      { userId: "u1", profileId: "profile-1", goalId: "g1", isPro: true, mode: "parallel", order: 3, parallelFraction: 0.25 },
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.goal.cascadeMode).toBe("parallel");
      expect(res.goal.cascadeOrder).toBe(3);
      expect(res.goal.cascadeParallelPct).toBe(0.25);
    }
  });
});
