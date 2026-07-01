import {
  BASE_CURRENCY,
  convertAssetToBase,
  type ConvertEntityDeps,
} from "@/application/use-cases/fx/convert-entity-to-base";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import { isOk } from "@/shared/errors/result";

export interface ResolveGoalProgressInputsDeps extends ConvertEntityDeps {
  assets: AssetRepositoryPort;
}

export interface ResolvedGoalProgressInputs {
  goal: GoalEntity;
  macro: GoalMacro;
}

/**
 * Ajusta goal/macro pra metas com ativo vinculado, antes do calculo de
 * progresso:
 * - savings com fundingMode "linked" e linkedAssetId: injeta o saldo do
 *   ativo (convertido pra BRL) em manualSavedCents.
 * - emergency_fund com linkedAssetId: substitui o cash agregado
 *   (macro.cashReserveCents) pelo saldo desse ativo especifico, pra nao
 *   misturar saldo livre/Carteira com a reserva vinculada.
 * Ativo nao encontrado ou conversao FX falha: retorna goal/macro
 * inalterados (degrade seguro pro comportamento agregado).
 */
export async function resolveGoalProgressInputs(
  deps: ResolveGoalProgressInputsDeps,
  goal: GoalEntity,
  macro: GoalMacro,
  profileId: string,
): Promise<ResolvedGoalProgressInputs> {
  if (goal.type === "savings" && goal.fundingMode === "linked" && goal.linkedAssetId) {
    const asset = await deps.assets.findById(goal.linkedAssetId, profileId);
    if (!asset) return { goal, macro };
    const converted = await convertAssetToBase(deps, goal.userId, asset, BASE_CURRENCY);
    if (!isOk(converted)) return { goal, macro };
    return { goal: { ...goal, manualSavedCents: converted.value.currentValue.toCents() }, macro };
  }

  if (goal.type === "emergency_fund" && goal.linkedAssetId) {
    const asset = await deps.assets.findById(goal.linkedAssetId, profileId);
    if (!asset) return { goal, macro };
    const converted = await convertAssetToBase(deps, goal.userId, asset, BASE_CURRENCY);
    if (!isOk(converted)) return { goal, macro };
    return { goal, macro: { ...macro, cashReserveCents: converted.value.currentValue.toCents() } };
  }

  return { goal, macro };
}
