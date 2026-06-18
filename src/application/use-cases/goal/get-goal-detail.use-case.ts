import type { BuildGoalMacroDeps } from "@/application/use-cases/goal/build-goal-macro";
import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
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
  if (!goal || goal.profileId !== profileId) return null;

  const [macro, snapshotList, contributionList] = await Promise.all([
    buildGoalMacro(deps, { userId, profileId }),
    deps.snapshots.listForGoal(goalId),
    deps.contributions.listForGoal(goalId, CONTRIBUTIONS_LIMIT),
  ]);

  const resolved = await resolveLinkedAsset(deps, goal, profileId);
  const rawProgress = GoalProgressService.compute(resolved, macro);

  const { progress, etaLocked } = isPro
    ? { progress: rawProgress, etaLocked: false }
    : { progress: { ...rawProgress, etaMonths: null }, etaLocked: true };

  return { goal, progress, etaLocked, snapshots: snapshotList, contributions: contributionList };
}

/**
 * Para metas `savings` com `fundingMode === "linked"` e `linkedAssetId`,
 * injeta o valor atual do ativo em `manualSavedCents` antes do calculo.
 */
async function resolveLinkedAsset(
  deps: GetGoalDetailDeps,
  goal: GoalEntity,
  profileId: string,
): Promise<GoalEntity> {
  if (
    goal.type !== "savings" ||
    goal.fundingMode !== "linked" ||
    !goal.linkedAssetId
  ) {
    return goal;
  }

  const asset = await deps.assets.findById(goal.linkedAssetId, profileId);
  if (!asset) return goal;

  return { ...goal, manualSavedCents: asset.currentValue.toCents() };
}
