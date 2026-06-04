import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import {
  GoalCascadeService,
  type CascadeResult,
} from "@/domain/services/goal-cascade.service";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import {
  PatrimonyProjectionService,
  type ProjectionDebtInput,
  type ProjectionResult,
} from "@/domain/services/patrimony-projection.service";

import { resolveLiquidBucketRate } from "./asset-rate";
import { buildCascadeInputs } from "./build-cascade-inputs";
import { buildProjectionAssetInputs } from "./build-projection-asset-inputs";

export interface AssemblePlanningViewArgs {
  goals: GoalEntity[];
  macro: GoalMacro;
  assets: AssetEntity[];
  debts: ProjectionDebtInput[];
  liquidBucketAssetId: string | null;
  monthlyFreeCashFlowCents: bigint;
  horizonMonths: number;
}

export interface PlanningView {
  cascade: CascadeResult;
  projection: ProjectionResult;
}

export function assemblePlanningView(args: AssemblePlanningViewArgs): PlanningView {
  const cascade = GoalCascadeService.simulate({
    goals: buildCascadeInputs({ goals: args.goals, macro: args.macro, assets: args.assets }),
    monthlyFreeCashFlowCents: args.monthlyFreeCashFlowCents,
    horizonMonths: args.horizonMonths,
  });

  const projection = PatrimonyProjectionService.project({
    assets: buildProjectionAssetInputs(args.assets),
    debts: args.debts,
    monthlyFreeCashFlowCents: args.monthlyFreeCashFlowCents,
    liquidBucketMonthlyRate: resolveLiquidBucketRate(args.assets, args.liquidBucketAssetId),
    horizonMonths: args.horizonMonths,
  });

  return { cascade, projection };
}
