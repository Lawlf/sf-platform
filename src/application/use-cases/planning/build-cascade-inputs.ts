import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { CascadeGoalInput } from "@/domain/services/goal-cascade.service";
import { GoalProgressService, type GoalMacro } from "@/domain/services/goal-progress.service";

import { annualPctToMonthlyRate, resolveAssetMonthlyRate } from "./asset-rate";

export function buildCascadeInputs(args: {
  goals: GoalEntity[];
  macro: GoalMacro;
  assets: AssetEntity[];
}): CascadeGoalInput[] {
  return args.goals.map((goal) => {
    const mode = goal.cascadeMode ?? "queue";
    const order = goal.cascadeOrder ?? Number.MAX_SAFE_INTEGER;
    const parallelFraction = goal.cascadeParallelPct ?? 0;

    if (goal.type === "debt_payoff") {
      const debt = args.macro.debts.find((d) => d.id === goal.linkedDebtId);
      return {
        goalId: goal.id,
        kind: "payoff",
        balanceCents: debt ? debt.currentBalanceCents : 0n,
        targetCents: 0n,
        monthlyRate: debt ? annualPctToMonthlyRate(debt.annualRatePct) : 0,
        mode,
        order,
        parallelFraction,
      };
    }

    const progress = GoalProgressService.compute(goal, args.macro);
    let monthlyRate = 0;
    if (goal.type === "financial_independence" && goal.realReturnPct !== null) {
      monthlyRate = annualPctToMonthlyRate(goal.realReturnPct);
    } else {
      const linkedAsset = args.assets.find((a) => a.id === goal.linkedAssetId);
      monthlyRate = linkedAsset ? resolveAssetMonthlyRate(linkedAsset) : 0;
    }

    return {
      goalId: goal.id,
      kind: "accumulate",
      balanceCents: progress.currentCents,
      targetCents: progress.targetCents,
      monthlyRate,
      mode,
      order,
      parallelFraction,
    };
  });
}
