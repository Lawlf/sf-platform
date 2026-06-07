import { describe, expect, it } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalMacro } from "@/domain/services/goal-progress.service";

import { annualPctToMonthlyRate } from "./asset-rate";
import { buildCascadeInputs } from "./build-cascade-inputs";

function goal(p: Partial<GoalEntity> & Pick<GoalEntity, "type">): GoalEntity {
  return {
    id: "g1", userId: "u1", title: "g", status: "active",
    targetCents: null, deadline: null, linkedDebtId: null, linkedAssetId: null,
    targetMonths: null, fundingMode: null, manualSavedCents: null, monthlyCostCents: null,
    realReturnPct: null, cascadeOrder: null, cascadeMode: null, cascadeParallelPct: null,
    createdAt: new Date(0), updatedAt: new Date(0), ...p,
  };
}

const MACRO: GoalMacro = {
  investedCents: 0n, cashReserveCents: 0n, contributionCents: 100000n,
  monthlyServiceCents: 0n, monthlyIncomeCents: 500000n, debts: [],
};

describe("buildCascadeInputs", () => {
  it("maps a savings goal to an accumulate input with config defaults", () => {
    const g = goal({ type: "savings", targetCents: 500000n, manualSavedCents: 100000n });
    const [input] = buildCascadeInputs({ goals: [g], macro: MACRO, assets: [] });
    expect(input).toMatchObject({
      goalId: "g1", kind: "accumulate", balanceCents: 100000n, targetCents: 500000n,
      monthlyRate: 0, mode: "queue", order: Number.MAX_SAFE_INTEGER, parallelFraction: 0,
    });
  });

  it("maps a debt_payoff goal to a payoff input using the linked debt balance and rate", () => {
    const macro: GoalMacro = {
      ...MACRO,
      debts: [{ id: "d1", originalPrincipalCents: 200000n, currentBalanceCents: 150000n, monthlyPaymentCents: 30000n, annualRatePct: 24 }],
    };
    const g = goal({ type: "debt_payoff", linkedDebtId: "d1" });
    const [input] = buildCascadeInputs({ goals: [g], macro, assets: [] });
    expect(input!.kind).toBe("payoff");
    expect(input!.balanceCents).toBe(150000n);
    expect(input!.targetCents).toBe(0n);
    expect(input!.monthlyRate).toBeCloseTo(annualPctToMonthlyRate(24), 12);
  });

  it("uses the goal's cascade config when present", () => {
    const g = goal({ type: "savings", targetCents: 100000n, cascadeMode: "parallel", cascadeOrder: 2, cascadeParallelPct: 0.3 });
    const [input] = buildCascadeInputs({ goals: [g], macro: MACRO, assets: [] });
    expect(input!.mode).toBe("parallel");
    expect(input!.order).toBe(2);
    expect(input!.parallelFraction).toBe(0.3);
  });

  it("derives an accumulate goal's rate from its linked asset", () => {
    const g = goal({ type: "savings", targetCents: 100000n, linkedAssetId: "buck" });
    const assets = [{
      id: "buck", userId: "u1", category: "cash" as const, label: "x",
      currentValue: { toCents: () => 0n } as never,
      metadata: { kind: "cash" as const, yieldType: "fixed_pct_year" as const, yieldRatePct: 10 },
      fipeCode: null, fipeLastSyncedAt: null, acquiredAt: null, depreciationKind: "stable" as const,
      depreciationRatePctYear: 0, purchaseDate: null, purchasePriceCents: null,
      createdAt: new Date(0), updatedAt: new Date(0), deactivatedAt: null, deactivationKind: null,
      salePriceCents: null, deactivationReason: null, deletedAt: null, externalAccountKey: null,
    }];
    const [input] = buildCascadeInputs({ goals: [g], macro: MACRO, assets });
    expect(input!.monthlyRate).toBeCloseTo(annualPctToMonthlyRate(10), 12);
  });

  it("uses the FI goal's realReturnPct for its rate", () => {
    const g = goal({ type: "financial_independence", monthlyCostCents: 300000n, realReturnPct: 4 });
    const [input] = buildCascadeInputs({ goals: [g], macro: MACRO, assets: [] });
    expect(input!.monthlyRate).toBeCloseTo(annualPctToMonthlyRate(4), 12);
  });
});
