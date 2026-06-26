import { describe, expect, it } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalMacro } from "@/domain/services/goal-progress.service";

import { plannedGoalReserveCents } from "./goal-reserve.service";

const NOW = new Date("2026-06-15T00:00:00Z");

const MACRO: GoalMacro = {
  investedCents: 0n,
  cashReserveCents: 0n,
  contributionCents: 0n,
  monthlyServiceCents: 0n,
  monthlyIncomeCents: 0n,
  debts: [],
};

function makeGoal(overrides: Partial<GoalEntity> = {}): GoalEntity {
  return {
    id: "g1",
    userId: "u1",
    profileId: "p1",
    householdId: null,
    type: "savings",
    title: "Meta",
    status: "active",
    targetCents: null,
    deadline: null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: null,
    fundingMode: "manual",
    manualSavedCents: null,
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

describe("plannedGoalReserveCents", () => {
  it("rateia o que falta da meta priorizada pelo prazo em meses", () => {
    const goal = makeGoal({
      cascadeOrder: 0,
      targetCents: 1_200_000n,
      manualSavedCents: 0n,
      targetMonths: 12,
    });

    expect(plannedGoalReserveCents({ goals: [goal], macro: MACRO, now: NOW })).toBe(100_000n);
  });

  it("usa o prazo até a data-limite quando há deadline", () => {
    const goal = makeGoal({
      cascadeOrder: 0,
      targetCents: 600_000n,
      manualSavedCents: 0n,
      deadline: new Date("2026-09-15T00:00:00Z"),
    });

    expect(plannedGoalReserveCents({ goals: [goal], macro: MACRO, now: NOW })).toBe(200_000n);
  });

  it("ignora meta de quitar dívida (já está nas parcelas)", () => {
    const goal = makeGoal({
      type: "debt_payoff",
      cascadeOrder: 0,
      linkedDebtId: "d1",
      targetMonths: 10,
    });

    expect(plannedGoalReserveCents({ goals: [goal], macro: MACRO, now: NOW })).toBe(0n);
  });

  it("ignora meta não priorizada", () => {
    const goal = makeGoal({
      cascadeOrder: null,
      targetCents: 1_200_000n,
      manualSavedCents: 0n,
      targetMonths: 12,
    });

    expect(plannedGoalReserveCents({ goals: [goal], macro: MACRO, now: NOW })).toBe(0n);
  });

  it("meta já atingida não reserva nada", () => {
    const goal = makeGoal({
      cascadeOrder: 0,
      targetCents: 500_000n,
      manualSavedCents: 500_000n,
      targetMonths: 12,
    });

    expect(plannedGoalReserveCents({ goals: [goal], macro: MACRO, now: NOW })).toBe(0n);
  });

  it("sem prazo nem data-limite não dá pra dimensionar: reserva zero", () => {
    const goal = makeGoal({
      cascadeOrder: 0,
      targetCents: 1_200_000n,
      manualSavedCents: 0n,
    });

    expect(plannedGoalReserveCents({ goals: [goal], macro: MACRO, now: NOW })).toBe(0n);
  });

  it("soma o aporte de várias metas priorizadas", () => {
    const a = makeGoal({ id: "a", cascadeOrder: 0, targetCents: 1_200_000n, manualSavedCents: 0n, targetMonths: 12 });
    const b = makeGoal({ id: "b", cascadeOrder: 1, targetCents: 600_000n, manualSavedCents: 0n, targetMonths: 6 });

    expect(plannedGoalReserveCents({ goals: [a, b], macro: MACRO, now: NOW })).toBe(200_000n);
  });
});
