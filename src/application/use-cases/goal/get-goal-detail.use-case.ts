import type { BuildGoalMacroDeps } from "@/application/use-cases/goal/build-goal-macro";
import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import { resolveGoalProgressInputs } from "@/application/use-cases/goal/resolve-goal-progress-inputs";
import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";
import type { GoalSnapshotEntity } from "@/domain/entities/goal-snapshot.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalContributionRepositoryPort } from "@/domain/ports/repositories/goal-contribution.repository";
import type { GoalSnapshotRepositoryPort } from "@/domain/ports/repositories/goal-snapshot.repository";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import { GoalProgressService, type GoalProgress } from "@/domain/services/goal-progress.service";

const CONTRIBUTIONS_LIMIT = 20;

export interface GetGoalDetailDeps extends BuildGoalMacroDeps {
  goals: GoalRepositoryPort;
  snapshots: GoalSnapshotRepositoryPort;
  contributions: GoalContributionRepositoryPort;
}

export interface GoalDetailResult {
  goal: GoalEntity;
  progress: GoalProgress;
  etaLocked: boolean;
  snapshots: GoalSnapshotEntity[];
  contributions: GoalContributionEntity[];
}

/**
 * Retorna o detalhe completo de uma meta, incluindo progresso calculado e
 * historico de snapshots mensais.
 *
 * Retorna null se a meta nao for encontrada ou nao pertencer ao usuario.
 *
 * Para metas com ativo vinculado (savings linked ou emergency_fund com
 * linkedAssetId), `resolveGoalProgressInputs` ajusta o goal/macro antes do
 * calculo (ver esse arquivo pra detalhes de cada caso, incluindo conversao
 * de moeda).
 */
export async function getGoalDetail(
  deps: GetGoalDetailDeps,
  {
    userId,
    profileId,
    goalId,
    isPro,
  }: { userId: string; profileId: string; goalId: string; isPro: boolean },
): Promise<GoalDetailResult | null> {
  const goal = await deps.goals.findById(goalId);
  if (!goal || goal.profileId !== profileId || goal.householdId !== null) return null;

  const [macro, snapshotList, contributionList] = await Promise.all([
    buildGoalMacro(deps, { userId, profileId }),
    deps.snapshots.listForGoal(goalId),
    deps.contributions.listForGoal(goalId, CONTRIBUTIONS_LIMIT),
  ]);

  const { goal: resolvedGoal, macro: resolvedMacro } = await resolveGoalProgressInputs(
    deps,
    goal,
    macro,
    profileId,
  );
  const rawProgress = GoalProgressService.compute(resolvedGoal, resolvedMacro);

  const { progress, etaLocked } = isPro
    ? { progress: rawProgress, etaLocked: false }
    : { progress: { ...rawProgress, etaMonths: null }, etaLocked: true };

  return { goal, progress, etaLocked, snapshots: snapshotList, contributions: contributionList };
}
