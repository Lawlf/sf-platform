import { describe, expect, it, vi } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { HouseholdMemberEntity } from "@/domain/entities/household.entity";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { isErr, isOk } from "@/shared/errors/result";

import {
  createHouseholdGoal,
  type CreateHouseholdGoalDeps,
} from "./create-household-goal.use-case";

const NOW = new Date("2026-06-18T10:00:00Z");

function makeMember(overrides: Partial<HouseholdMemberEntity> = {}): HouseholdMemberEntity {
  return { householdId: "h1", userId: "u1", role: "member", joinedAt: NOW, ...overrides };
}

function makeDeps(member: HouseholdMemberEntity | null): CreateHouseholdGoalDeps {
  const goalStore: GoalEntity[] = [];
  const goals: Pick<GoalRepositoryPort, "create"> = {
    create: vi.fn(async (g: Omit<GoalEntity, "createdAt" | "updatedAt">) => {
      const entity: GoalEntity = { ...g, createdAt: NOW, updatedAt: NOW };
      goalStore.push(entity);
      return entity;
    }),
  };
  const households: Pick<HouseholdRepositoryPort, "findMembership"> = {
    findMembership: vi.fn(async () => member),
  };
  return {
    households: households as unknown as HouseholdRepositoryPort,
    goals: goals as unknown as GoalRepositoryPort,
    clock: { now: () => NOW },
    newId: () => "new-goal-id",
  };
}

describe("createHouseholdGoal", () => {
  it("retorna Forbidden para nao membro", async () => {
    const deps = makeDeps(null);
    const r = await createHouseholdGoal(deps, {
      householdId: "h1",
      userId: "outsider",
      profileId: "p-outsider",
      label: "Casa propria",
      targetCents: 500_000_00n,
    });

    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe("FORBIDDEN");
    }
    expect(deps.goals.create).not.toHaveBeenCalled();
  });

  it("cria meta do lar com householdId, type savings e fundingMode manual", async () => {
    const member = makeMember({ userId: "u1" });
    const deps = makeDeps(member);

    const r = await createHouseholdGoal(deps, {
      householdId: "h1",
      userId: "u1",
      profileId: "p1",
      label: "Casa propria",
      targetCents: 500_000_00n,
    });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.householdId).toBe("h1");
      expect(r.value.type).toBe("savings");
      expect(r.value.fundingMode).toBe("manual");
      expect(r.value.manualSavedCents).toBe(0n);
      expect(r.value.targetCents).toBe(500_000_00n);
      expect(r.value.profileId).toBe("p1");
    }
    expect(deps.goals.create).toHaveBeenCalledOnce();
  });
});
