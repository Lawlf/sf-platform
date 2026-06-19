import { describe, expect, it, vi } from "vitest";

import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";
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

function makeContribution(
  overrides: Partial<GoalContributionEntity> = {},
): GoalContributionEntity {
  return {
    id: "c1",
    goalId: "g1",
    userId: "u1",
    profileId: "p1",
    amountCents: 1_000_00n,
    createdAt: NOW,
    ...overrides,
  };
}

function makeDeps(
  member: HouseholdMemberEntity | null,
  householdGoals: GoalEntity[],
  contributions: GoalContributionEntity[] = [],
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
    contributions: { listForGoal: vi.fn(async () => contributions) },
    now: () => NOW,
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

  it("etaMonths e null quando nao ha contribuicoes", async () => {
    const member = makeMember();
    const goal = makeGoal({ manualSavedCents: 100_000_00n, targetCents: 500_000_00n });
    const deps = makeDeps(member, [goal], []);

    const r = await listHouseholdGoals(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value[0]!.etaMonths).toBeNull();
    }
  });

  it("etaMonths e null quando targetCents e null", async () => {
    const member = makeMember();
    const goal = makeGoal({ targetCents: null, manualSavedCents: 50_000n });
    const c = makeContribution({ amountCents: 50_000n });
    const deps = makeDeps(member, [goal], [c]);

    const r = await listHouseholdGoals(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value[0]!.etaMonths).toBeNull();
    }
  });

  it("etaMonths calculado a partir do ritmo de contribuicoes em meses distintos", async () => {
    const member = makeMember();
    const goal = makeGoal({
      manualSavedCents: 20_000_00n,
      targetCents: 100_000_00n,
    });

    const MAY = new Date("2026-05-10T10:00:00Z");
    const APR = new Date("2026-04-10T10:00:00Z");

    const c1 = makeContribution({ id: "c1", amountCents: 5_000_00n, createdAt: APR });
    const c2 = makeContribution({ id: "c2", amountCents: 5_000_00n, createdAt: MAY });

    const deps = makeDeps(member, [goal], [c1, c2]);

    const r = await listHouseholdGoals(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      const view = r.value[0]!;
      // Ritmo: 1_000_000 / 3 meses (abr + mai + jun=NOW) = 333_333 centavos/mes (bigint)
      // Faltam: 10_000_000 - 2_000_000 = 8_000_000 centavos
      // etaMonths = ceil(8_000_000 / 333_333) = 25
      expect(view.etaMonths).toBe(25);
    }
  });

  it("etaMonths e 0 quando meta ja esta completa", async () => {
    const member = makeMember();
    const goal = makeGoal({
      manualSavedCents: 100_000_00n,
      targetCents: 100_000_00n,
    });
    const c = makeContribution({ amountCents: 100_000_00n, createdAt: NOW });
    const deps = makeDeps(member, [goal], [c]);

    const r = await listHouseholdGoals(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value[0]!.etaMonths).toBe(0);
    }
  });

  it("contribuicoes no mesmo mes contam como 1 mes distinto", async () => {
    const member = makeMember();
    const goal = makeGoal({
      manualSavedCents: 10_000_00n,
      targetCents: 50_000_00n,
    });

    const c1 = makeContribution({ id: "c1", amountCents: 5_000_00n, createdAt: NOW });
    const c2 = makeContribution({ id: "c2", amountCents: 5_000_00n, createdAt: NOW });

    const deps = makeDeps(member, [goal], [c1, c2]);

    const r = await listHouseholdGoals(deps, { householdId: "h1", userId: "u1" });

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      const view = r.value[0]!;
      // Ritmo: 10.000 / 1 mes = 10.000/mes
      // Faltam: 50.000 - 10.000 = 40.000
      // etaMonths = ceil(40.000 / 10.000) = 4
      expect(view.etaMonths).toBe(4);
    }
  });
});
