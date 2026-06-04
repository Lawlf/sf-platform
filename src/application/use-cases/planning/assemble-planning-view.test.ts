import { describe, expect, it } from "vitest";

import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalMacro } from "@/domain/services/goal-progress.service";

import { assemblePlanningView } from "./assemble-planning-view";

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
  investedCents: 0n, cashReserveCents: 0n, contributionCents: 200000n,
  monthlyServiceCents: 0n, monthlyIncomeCents: 500000n, debts: [],
};

describe("assemblePlanningView", () => {
  it("runs the cascade and the projection over the same free cash flow", () => {
    const g = goal({ type: "savings", targetCents: 800000n, manualSavedCents: 0n });
    const view = assemblePlanningView({
      goals: [g],
      macro: MACRO,
      assets: [],
      debts: [],
      liquidBucketAssetId: null,
      monthlyFreeCashFlowCents: 200000n,
      horizonMonths: 12,
    });

    // cascade: 800000 / 200000 = 4 months
    expect(view.cascade.goals[0]!.etaMonth).toBe(4);
    // projection: 12 points, net worth grows from the accumulating bucket (no yield -> +2000/mo)
    expect(view.projection.points).toHaveLength(12);
    expect(view.projection.points[0]!.netWorthCents).toBe(200000n);
    expect(view.projection.points[11]!.netWorthCents).toBe(2400000n);
  });

  it("returns empty cascade goals and a flat projection when there is nothing", () => {
    const view = assemblePlanningView({
      goals: [], macro: { ...MACRO, contributionCents: 0n }, assets: [], debts: [],
      liquidBucketAssetId: null, monthlyFreeCashFlowCents: 0n, horizonMonths: 6,
    });
    expect(view.cascade.goals).toEqual([]);
    expect(view.projection.points).toHaveLength(6);
    expect(view.projection.points[5]!.netWorthCents).toBe(0n);
  });
});
