import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import {
  GoalCascadeService,
  type CascadeResult,
} from "@/domain/services/goal-cascade.service";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import {
  PatrimonyProjectionService,
  type ProjectionResult,
} from "@/domain/services/patrimony-projection.service";
import { isErr, ok, type Result } from "@/shared/errors/result";

import {
  BASE_CURRENCY,
  convertAssetToBase,
  convertDebtToBase,
  type ConvertEntityDeps,
} from "../fx/convert-entity-to-base";

import { resolveLiquidBucketRate } from "./asset-rate";
import { buildCascadeInputs } from "./build-cascade-inputs";
import { buildProjectionAssetInputs } from "./build-projection-asset-inputs";
import { buildProjectionDebtInputs } from "./build-projection-debt-inputs";

export type AssemblePlanningViewDeps = ConvertEntityDeps;

export interface AssemblePlanningViewArgs {
  userId: string;
  goals: GoalEntity[];
  macro: GoalMacro;
  assets: AssetEntity[];
  debts: DebtEntity[];
  liquidBucketAssetId: string | null;
  monthlyFreeCashFlowCents: bigint;
  horizonMonths: number;
}

export interface PlanningView {
  cascade: CascadeResult;
  projection: ProjectionResult;
}

export async function assemblePlanningView(
  deps: AssemblePlanningViewDeps,
  args: AssemblePlanningViewArgs,
): Promise<Result<PlanningView, FxRateUnavailableError>> {
  const assets: AssetEntity[] = [];
  for (const asset of args.assets) {
    const r = await convertAssetToBase(deps, args.userId, asset, BASE_CURRENCY);
    if (isErr(r)) return r;
    assets.push(r.value);
  }

  const debts: DebtEntity[] = [];
  for (const debt of args.debts) {
    const r = await convertDebtToBase(deps, args.userId, debt, BASE_CURRENCY);
    if (isErr(r)) return r;
    debts.push(r.value);
  }

  const cascade = GoalCascadeService.simulate({
    goals: buildCascadeInputs({ goals: args.goals, macro: args.macro, assets }),
    monthlyFreeCashFlowCents: args.monthlyFreeCashFlowCents,
    horizonMonths: args.horizonMonths,
  });

  const projection = PatrimonyProjectionService.project({
    assets: buildProjectionAssetInputs(assets),
    debts: buildProjectionDebtInputs(debts),
    monthlyFreeCashFlowCents: args.monthlyFreeCashFlowCents,
    liquidBucketMonthlyRate: resolveLiquidBucketRate(assets, args.liquidBucketAssetId),
    horizonMonths: args.horizonMonths,
  });

  return ok({ cascade, projection });
}
