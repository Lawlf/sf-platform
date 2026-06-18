import { describe, expect, it, vi } from "vitest";

import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { HouseholdMemberEntity } from "@/domain/entities/household.entity";
import type { GoalContributionRepositoryPort } from "@/domain/ports/repositories/goal-contribution.repository";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isErr, isOk } from "@/shared/errors/result";

import {
  contributeHouseholdGoal,
  type ContributeHouseholdGoalDeps,
} from "./contribute-household-goal.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeMember(overrides: Partial<HouseholdMemberEntity> = {}): HouseholdMemberEntity {
  return { householdId: "h1", userId: "u1", role: "member", joinedAt: NOW, ...overrides };
}

function makeGoal(overrides: Partial<GoalEntity> = {}): GoalEntity {
  return {
    id: "g1",
    userId: "u1",
    profileId: "p1",
    householdId: "h1",
    type: "savings",
    title: "Casa propria",
    status: "active",
    targetCents: 500_000_00n,
    manualSavedCents: 100_000_00n,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: null,
    fundingMode: "manual",
    monthlyCostCents: null,
    realReturnPct: null,
    cascadeOrder: null,
    cascadeMode: null,
    cascadeParallelPct: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

interface Harness {
  deps: ContributeHouseholdGoalDeps;
  goalStore: Map<string, GoalEntity>;
  contributions: GoalContributionEntity[];
}

function makeDeps(
  member: HouseholdMemberEntity | null,
  goal: GoalEntity | null,
): Harness {
  const goalStore = new Map<string, GoalEntity>();
  if (goal) goalStore.set(goal.id, goal);

  const contributions: GoalContributionEntity[] = [];

  const goals: Pick<GoalRepositoryPort, "findByIdInHousehold" | "update"> = {
    findByIdInHousehold: vi.fn(async (goalId: string, householdId: string) => {
      const g = goalStore.get(goalId);
      if (!g || g.householdId !== householdId) return null;
      return g;
    }),
    update: vi.fn(async (id: string, patch: Partial<GoalEntity>) => {
      const existing = goalStore.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch, updatedAt: NOW };
      goalStore.set(id, updated);
      return updated;
    }),
  };

  const contribRepo: GoalContributionRepositoryPort = {
    add: vi.fn(async (c: GoalContributionEntity) => {
      contributions.push(c);
    }),
    listForGoal: vi.fn(async () => []),
  };

  const households: Pick<HouseholdRepositoryPort, "findMembership"> = {
    findMembership: vi.fn(async () => member),
  };

  const deps: ContributeHouseholdGoalDeps = {
    households: households as unknown as HouseholdRepositoryPort,
    goals: goals as unknown as GoalRepositoryPort,
    contributions: contribRepo,
    clock: { now: () => NOW },
    newId: () => "new-contrib-id",
  };

  return { deps, goalStore, contributions };
}

describe("contributeHouseholdGoal", () => {
  it("retorna Forbidden para nao membro", async () => {
    const goal = makeGoal();
    const { deps, contributions } = makeDeps(null, goal);

    const r = await contributeHouseholdGoal(deps, {
      householdId: "h1",
      userId: "outsider",
      profileId: "p-out",
      goalId: "g1",
      amountCents: 10_000n,
    });

    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("FORBIDDEN");
    expect(contributions).toHaveLength(0);
  });

  it("retorna erro para meta de outro household", async () => {
    const member = makeMember();
    const goal = makeGoal({ householdId: "h-outro" });
    const { deps, contributions } = makeDeps(member, goal);

    const r = await contributeHouseholdGoal(deps, {
      householdId: "h1",
      userId: "u1",
      profileId: "p1",
      goalId: "g1",
      amountCents: 10_000n,
    });

    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("HOUSEHOLD_GOAL_NOT_FOUND");
    expect(contributions).toHaveLength(0);
  });

  it("soma manualSavedCents e grava contribuicao do membro", async () => {
    const member = makeMember({ userId: "u2", householdId: "h1" });
    const goal = makeGoal({ manualSavedCents: 100_000_00n });
    const { deps, goalStore, contributions } = makeDeps(member, goal);

    const r = await contributeHouseholdGoal(deps, {
      householdId: "h1",
      userId: "u2",
      profileId: "p2",
      goalId: "g1",
      amountCents: 50_000_00n,
    });

    expect(isOk(r)).toBe(true);
    expect(goalStore.get("g1")!.manualSavedCents).toBe(150_000_00n);
    expect(contributions).toHaveLength(1);
    expect(contributions[0]!.amountCents).toBe(50_000_00n);
    expect(contributions[0]!.userId).toBe("u2");
    expect(contributions[0]!.profileId).toBe("p2");
    expect(contributions[0]!.goalId).toBe("g1");
  });

  it("rejeita valor zero", async () => {
    const member = makeMember();
    const goal = makeGoal();
    const { deps, contributions } = makeDeps(member, goal);

    const r = await contributeHouseholdGoal(deps, {
      householdId: "h1",
      userId: "u1",
      profileId: "p1",
      goalId: "g1",
      amountCents: 0n,
    });

    expect(isErr(r)).toBe(true);
    expect(contributions).toHaveLength(0);
  });
});
