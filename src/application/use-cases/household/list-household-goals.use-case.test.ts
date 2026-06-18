import { describe, expect, it, vi } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { HouseholdMemberEntity } from "@/domain/entities/household.entity";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isErr, isOk } from "@/shared/errors/result";

import {
  listHouseholdGoals,
  type ListHouseholdGoalsDeps,
} from "./list-household-goals.use-case";

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

function makeDeps(
  member: HouseholdMemberEntity | null,
  householdGoals: GoalEntity[],
): ListHouseholdGoalsDeps {
  const households: Pick<HouseholdRepositoryPort, "findMembership"> = {
    findMembership: vi.fn(async () => member),
  };
  const goals: Pick<GoalRepositoryPort, "listForHousehold"> = {
    listForHousehold: vi.fn(async () => householdGoals),
  };
  return {
    households: households as unknown as HouseholdRepositoryPort,
    goals: goals as unknown as GoalRepositoryPort,
    contributions: { listForGoal: vi.fn(async () => []) },
  };
}

describe("listHouseholdGoals", () => {
  it("retorna Forbidden para nao membro", async () => {
    const deps = makeDeps(null, []);

    const r = await listHouseholdGoals(deps, { householdId: "h1", userId: "outsider" });

    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("FORBIDDEN");
  });

  it("lista metas do lar com progresso calculado", async () => {
    const member = makeMember();
    const goal = makeGoal({
      manualSavedCents: 100_000_00n,
      targetCents: 500_000_00n,
    });
    const deps = makeDeps(member, [goal]);

    const r = await listHouseholdGoals(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value).toHaveLength(1);
      const view = r.value[0]!;
      expect(view.goal.id).toBe("g1");
      expect(view.savedCents).toBe(100_000_00n);
      expect(view.targetCents).toBe(500_000_00n);
      expect(view.progressPct).toBeCloseTo(20);
    }
  });

  it("progressPct e null quando targetCents e null", async () => {
    const member = makeMember();
    const goal = makeGoal({ targetCents: null, manualSavedCents: 50_000n });
    const deps = makeDeps(member, [goal]);

    const r = await listHouseholdGoals(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value[0]!.progressPct).toBeNull();
    }
  });

  it("retorna lista vazia quando nao ha metas do lar", async () => {
    const member = makeMember();
    const deps = makeDeps(member, []);

    const r = await listHouseholdGoals(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value).toHaveLength(0);
    }
  });
});
