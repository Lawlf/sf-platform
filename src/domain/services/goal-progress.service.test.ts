import { describe, expect, it } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";

import { GoalProgressService, type GoalMacro } from "./goal-progress.service";

const baseGoal = {
  id: "g1", userId: "u1", profileId: "profile-1", title: "t", status: "active" as const,
  targetCents: null, deadline: null, linkedDebtId: null, linkedAssetId: null,
  targetMonths: null, fundingMode: null, manualSavedCents: null,
  monthlyCostCents: null, realReturnPct: null,
  cascadeOrder: null, cascadeMode: null, cascadeParallelPct: null,
  createdAt: new Date(), updatedAt: new Date(),
};

const macro: GoalMacro = {
  investedCents: 50_000_00n,
  cashReserveCents: 12_000_00n,
  contributionCents: 1_000_00n,
  monthlyServiceCents: 2_000_00n,
  monthlyIncomeCents: 8_000_00n,
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
    expect(r.pct).toBeCloseTo(40, 3);
    expect(r.reached).toBe(false);
    expect(r.etaMonths).not.toBeNull();
  });

  it("debt_payoff: ritmo guardado (monthlyCostCents) manda na ETA", () => {
    const slow: GoalEntity = { ...baseGoal, type: "debt_payoff", linkedDebtId: "d1" };
    const fast: GoalEntity = {
      ...baseGoal,
      type: "debt_payoff",
      linkedDebtId: "d1",
      monthlyCostCents: 3_000_00n,
    };
    const rSlow = GoalProgressService.compute(slow, macro);
    const rFast = GoalProgressService.compute(fast, macro);
    expect(rSlow.etaMonths).not.toBeNull();
    expect(rFast.etaMonths).not.toBeNull();
    expect(rFast.etaMonths as number).toBeLessThan(rSlow.etaMonths as number);
  });

  it("debt_payoff: ritmo abaixo do juro mensal nunca quita (ETA null)", () => {
    // Saldo R$18.000 a 12% a.a. => juro ~R$170/mês; pagar R$100 não cobre.
    const goal: GoalEntity = {
      ...baseGoal,
      type: "debt_payoff",
      linkedDebtId: "d1",
      monthlyCostCents: 100_00n,
    };
    const r = GoalProgressService.compute(goal, macro);
    expect(r.etaMonths).toBeNull();
  });

  it("emergency_fund: sem custo explicito usa 75% da renda (6_000_00 x 6 = 36_000_00)", () => {
    // macro.monthlyIncomeCents = 8_000_00, sem monthlyCostCents na meta
    // custo estimado = 8_000_00 * 3 / 4 = 6_000_00; target = 6_000_00 * 6 = 36_000_00
    const goal: GoalEntity = { ...baseGoal, type: "emergency_fund", targetMonths: 6 };
    const r = GoalProgressService.compute(goal, macro);
    expect(Number(r.targetCents)).toBe(36_000_00);
    expect(Number(r.currentCents)).toBe(12_000_00);
    expect(r.reached).toBe(false);
  });

  it("emergency_fund: com monthlyCostCents explicito usa o valor informado (3_000_00 x 6 = 18_000_00)", () => {
    // custo explicito na meta: 3_000_00; target = 3_000_00 * 6 = 18_000_00
    const goal: GoalEntity = { ...baseGoal, type: "emergency_fund", targetMonths: 6, monthlyCostCents: 3_000_00n };
    const r = GoalProgressService.compute(goal, macro);
    expect(Number(r.targetCents)).toBe(18_000_00);
    expect(Number(r.currentCents)).toBe(12_000_00);
    expect(r.reached).toBe(false);
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

  it("emergency_fund: sem custo e sem renda -> needsAttention, nunca 100%/ok", () => {
    const semDado: GoalMacro = { ...macro, monthlyIncomeCents: 0n, cashReserveCents: 500_00n };
    const goal: GoalEntity = { ...baseGoal, type: "emergency_fund", targetMonths: 6 };
    const r = GoalProgressService.compute(goal, semDado);
    expect(r.needsAttention).toBe(true);
    expect(r.reached).toBe(false);
    expect(r.pct).toBe(0);
    expect(r.etaMonths).toBeNull();
  });

  it("financial_independence: sem custo informado -> needsAttention, nunca 'já livre'", () => {
    const goal: GoalEntity = { ...baseGoal, type: "financial_independence", monthlyCostCents: null, realReturnPct: 4 };
    const r = GoalProgressService.compute(goal, macro);
    expect(r.needsAttention).toBe(true);
    expect(r.reached).toBe(false);
    expect(r.pct).toBe(0);
  });

  it("financial_independence: retorno real 0% -> needsAttention (inviável), sem alvo 1000x", () => {
    const goal: GoalEntity = { ...baseGoal, type: "financial_independence", monthlyCostCents: 2_000_00n, realReturnPct: 0 };
    const r = GoalProgressService.compute(goal, macro);
    expect(r.needsAttention).toBe(true);
    expect(r.reached).toBe(false);
  });

  it("savings sem alvo (target 0) -> needsAttention, nunca falso reached", () => {
    const goal: GoalEntity = { ...baseGoal, type: "savings", fundingMode: "manual", manualSavedCents: 1_000_00n, targetCents: null };
    const r = GoalProgressService.compute(goal, macro);
    expect(r.needsAttention).toBe(true);
    expect(r.reached).toBe(false);
  });

  it("savings linked: progresso vem de manualSavedCents independente de fundingMode", () => {
    const goal: GoalEntity = {
      ...baseGoal,
      type: "savings",
      fundingMode: "linked",
      manualSavedCents: 20_000_00n,
      targetCents: 50_000_00n,
    };
    const r = GoalProgressService.compute(goal, macro);
    expect(Number(r.currentCents)).toBe(20_000_00);
    expect(Number(r.targetCents)).toBe(50_000_00);
    expect(r.pct).toBeCloseTo(40, 3);
    expect(r.reached).toBe(false);
  });
});
