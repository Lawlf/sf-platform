import { describe, expect, it } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";

import type { CreateGoalInput } from "./create-goal.use-case";
import { createGoal } from "./create-goal.use-case";

function repoWith(activeCount: number) {
  return {
    countActive: async () => activeCount,
    create: async (g: Omit<GoalEntity, "createdAt" | "updatedAt">) => ({ ...g, createdAt: new Date(), updatedAt: new Date() }),
  } as unknown as GoalRepository;
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
});
