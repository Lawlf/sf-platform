import { describe, expect, it } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";

import type { CreateGoalInput } from "./create-goal.use-case";
import { createGoal } from "./create-goal.use-case";

function makeGoal(overrides: Partial<GoalEntity> = {}): GoalEntity {
  return {
    id: crypto.randomUUID(),
    userId: "u1",
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

function repoWith(activeCount: number, activeGoals: GoalEntity[] = []) {
  return {
    countActive: async () => activeCount,
    listForUser: async () => activeGoals,
    create: async (g: Omit<GoalEntity, "createdAt" | "updatedAt">) => ({ ...g, createdAt: new Date(), updatedAt: new Date() }),
  } as unknown as GoalRepositoryPort;
}

describe("createGoal", () => {
  it("bloqueia 2a meta ativa para usuario Free", async () => {
    const r = await createGoal({ goals: repoWith(1) }, { userId: "u1", isPro: false, input: { type: "savings", title: "x", targetCents: 100n, fundingMode: "manual", manualSavedCents: 0n } as CreateGoalInput });
    expect(r.ok).toBe(false);
  });
  it("permite multiplas metas para Pro", async () => {
    const r = await createGoal({ goals: repoWith(3) }, { userId: "u1", isPro: true, input: { type: "savings", title: "x", targetCents: 100n, fundingMode: "manual", manualSavedCents: 0n } as CreateGoalInput });
    expect(r.ok).toBe(true);
  });
  it("emergency_fund persiste monthlyCostCents quando informado (vindo do simulador)", async () => {
    const r = await createGoal(
      { goals: repoWith(0) },
      {
        userId: "u1",
        isPro: true,
        input: {
          type: "emergency_fund",
          title: "Reserva",
          targetMonths: 6,
          monthlyCostCents: 300000n,
        } as CreateGoalInput,
      },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.goal.monthlyCostCents).toBe(300000n);
      expect(r.goal.targetMonths).toBe(6);
    }
  });

  it("recusa segunda meta debt_payoff ativa para a mesma divida", async () => {
    const existing = makeGoal({ type: "debt_payoff", linkedDebtId: "d1", status: "active" });
    const r = await createGoal(
      { goals: repoWith(1, [existing]) },
      {
        userId: "u1",
        isPro: true,
        input: { type: "debt_payoff", title: "Quitar", linkedDebtId: "d1" } as CreateGoalInput,
      },
    );
    expect(r.ok).toBe(false);
  });

  it("permite meta debt_payoff para divida diferente", async () => {
    const existing = makeGoal({ type: "debt_payoff", linkedDebtId: "d1", status: "active" });
    const r = await createGoal(
      { goals: repoWith(1, [existing]) },
      {
        userId: "u1",
        isPro: true,
        input: { type: "debt_payoff", title: "Quitar", linkedDebtId: "d2" } as CreateGoalInput,
      },
    );
    expect(r.ok).toBe(true);
  });
});
