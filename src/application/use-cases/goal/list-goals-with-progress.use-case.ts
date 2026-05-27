import type { BuildGoalMacroDeps } from "@/application/use-cases/goal/build-goal-macro";
import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";
import { GoalProgressService, type GoalProgress } from "@/domain/services/goal-progress.service";

export interface ListGoalsWithProgressDeps extends BuildGoalMacroDeps {
  goals: GoalRepository;
}

export interface GoalWithProgress {
  goal: GoalEntity;
  progress: GoalProgress;
  etaLocked: boolean;
}

/**
 * Lista as metas ativas do usuario e calcula o progresso de cada uma.
 *
 * Para metas do tipo `savings` com `fundingMode === "linked"` e um
 * `linkedAssetId`, o valor atual do ativo e buscado e injetado em
 * `manualSavedCents` antes do calculo (o GoalProgressService le o progresso
 * de poupanca a partir desse campo por convencao).
 *
 * O campo `etaMonths` retorna null e `etaLocked: true` para usuarios Free
 * (funcionalidade Pro).
 */
export async function listGoalsWithProgress(
  deps: ListGoalsWithProgressDeps,
  { userId, isPro }: { userId: string; isPro: boolean },
): Promise<GoalWithProgress[]> {
  const [activeGoals, macro] = await Promise.all([
    deps.goals.listForUser(userId, { status: "active" }),
    buildGoalMacro(deps, { userId }),
  ]);

  return Promise.all(
    activeGoals.map(async (goal) => {
      const resolved = await resolveLinkedAsset(deps, goal);
      const rawProgress = GoalProgressService.compute(resolved, macro);
      const { progress, etaLocked } = gateEta(rawProgress, isPro);
      return { goal, progress, etaLocked };
    }),
  );
}

/**
 * Se a meta for `savings` com `fundingMode === "linked"` e tiver um
 * `linkedAssetId`, substitui `manualSavedCents` pelo valor atual do ativo.
 * Caso o ativo nao seja encontrado, retorna a meta sem alteracao (progresso
 * mostrara 0).
 */
async function resolveLinkedAsset(
  deps: ListGoalsWithProgressDeps,
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

function gateEta(
  progress: GoalProgress,
  isPro: boolean,
): { progress: GoalProgress; etaLocked: boolean } {
  if (isPro) {
    return { progress, etaLocked: false };
  }
  return {
    progress: { ...progress, etaMonths: null },
    etaLocked: true,
  };
}
