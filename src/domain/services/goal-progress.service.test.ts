import { describe, expect, it } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";

import { GoalProgressService, type GoalMacro } from "./goal-progress.service";

const baseGoal = {
  id: "g1", userId: "u1", title: "t", status: "active" as const,
  targetCents: null, deadline: null, linkedDebtId: null, linkedAssetId: null,
  targetMonths: null, fundingMode: null, manualSavedCents: null,
  monthlyCostCents: null, realReturnPct: null,
  createdAt: new Date(), updatedAt: new Date(),
};

const macro: GoalMacro = {
  investedCents: 50_000_00n,
  cashReserveCents: 12_000_00n,
  contributionCents: 1_000_00n,
  monthlyServiceCents: 2_000_00n,
  debts: [
    { id: "d1", originalPrincipalCents: 30_000_00n, currentBalanceCents: 18_000_00n, monthlyPaymentCents: 1_000_00n, annualRatePct: 12 },
  ],
};

describe("GoalProgressService.compute", () => {
  it("debt_payoff: progresso = pago / principal, ETA do payoff", () => {
    const goal: GoalEntity = { ...baseGoal, type: "debt_payoff", linkedDebtId: "d1" };
    const r = GoalProgressService.compute(goal, macro);
    expect(Number(r.currentCents)).toBe(12_000_00);
    expect(Number(r.targetCents)).toBe(30_000_00);
    expect(r.pct).toBeCloseTo(0.4, 3);
    expect(r.reached).toBe(false);
    expect(r.etaMonths).not.toBeNull();
  });

  it("emergency_fund: reservas vs custo x meses", () => {
    const goal: GoalEntity = { ...baseGoal, type: "emergency_fund", targetMonths: 6 };
    const r = GoalProgressService.compute(goal, macro);
    expect(Number(r.targetCents)).toBe(12_000_00);
    expect(Number(r.currentCents)).toBe(12_000_00);
    expect(r.reached).toBe(true);
  });

  it("savings manual: progresso vs alvo, ETA por projecao", () => {
    const goal: GoalEntity = { ...baseGoal, type: "savings", fundingMode: "manual", manualSavedCents: 14_000_00n, targetCents: 50_000_00n };
    const r = GoalProgressService.compute(goal, macro);
    expect(Number(r.currentCents)).toBe(14_000_00);
    expect(Number(r.targetCents)).toBe(50_000_00);
    expect(r.etaMonths).not.toBeNull();
  });

  it("financial_independence: patrimonio vs alvo 4%", () => {
    const goal: GoalEntity = { ...baseGoal, type: "financial_independence", monthlyCostCents: 2_000_00n, realReturnPct: 4 };
    const r = GoalProgressService.compute(goal, macro);
    expect(Number(r.targetCents)).toBe(600_000_00);
    expect(Number(r.currentCents)).toBe(50_000_00);
    expect(r.etaMonths).not.toBeNull();
  });

  it("vinculo removido -> needsAttention, sem ETA", () => {
    const goal: GoalEntity = { ...baseGoal, type: "debt_payoff", linkedDebtId: "zzz" };
    const r = GoalProgressService.compute(goal, macro);
    expect(r.needsAttention).toBe(true);
    expect(r.etaMonths).toBeNull();
  });
});
