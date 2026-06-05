import type { BuildGoalMacroDeps } from "@/application/use-cases/goal/build-goal-macro";
import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";
import type { GoalSnapshotEntity } from "@/domain/entities/goal-snapshot.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalContributionRepository } from "@/domain/ports/repositories/goal-contribution.repository";
import type { GoalSnapshotRepository } from "@/domain/ports/repositories/goal-snapshot.repository";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";
import { GoalProgressService, type GoalProgress } from "@/domain/services/goal-progress.service";

const CONTRIBUTIONS_LIMIT = 20;

export interface GetGoalDetailDeps extends BuildGoalMacroDeps {
  goals: GoalRepository;
  snapshots: GoalSnapshotRepository;
  contributions: GoalContributionRepository;
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
    goalId,
    isPro,
  }: { userId: string; goalId: string; isPro: boolean },
): Promise<GoalDetailResult | null> {
  const goal = await deps.goals.findById(goalId);
  if (!goal || goal.userId !== userId) return null;

  const [macro, snapshotList, contributionList] = await Promise.all([
    buildGoalMacro(deps, { userId }),
    deps.snapshots.listForGoal(goalId),
    deps.contributions.listForGoal(goalId, CONTRIBUTIONS_LIMIT),
  ]);

  const resolved = await resolveLinkedAsset(deps, goal);
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
): Promise<GoalEntity> {
  if (
    goal.type !== "savings" ||
    goal.fundingMode !== "linked" ||
    !goal.linkedAssetId
  ) {
    return goal;
  }

  const asset = await deps.assets.findById(goal.linkedAssetId, goal.userId);
  if (!asset) return goal;

  return { ...goal, manualSavedCents: asset.currentValue.toCents() };
}
