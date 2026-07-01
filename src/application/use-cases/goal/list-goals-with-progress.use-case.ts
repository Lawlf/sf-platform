import type { BuildGoalMacroDeps } from "@/application/use-cases/goal/build-goal-macro";
import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import { resolveGoalProgressInputs } from "@/application/use-cases/goal/resolve-goal-progress-inputs";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import { GoalProgressService, type GoalProgress } from "@/domain/services/goal-progress.service";

export interface ListGoalsWithProgressDeps extends BuildGoalMacroDeps {
  goals: GoalRepositoryPort;
}

export interface GoalWithProgress {
  goal: GoalEntity;
  progress: GoalProgress;
  etaLocked: boolean;
}

/**
 * Lista as metas ativas do usuario e calcula o progresso de cada uma.
 *
 * Para metas com ativo vinculado (savings linked ou emergency_fund com
 * linkedAssetId), `resolveGoalProgressInputs` ajusta o goal/macro antes do
 * calculo (ver esse arquivo pra detalhes de cada caso).
 *
 * O campo `etaMonths` retorna null e `etaLocked: true` para usuarios Free
 * (funcionalidade Pro).
 */
export async function listGoalsWithProgress(
  deps: ListGoalsWithProgressDeps,
  { userId, profileId, isPro }: { userId: string; profileId: string; isPro: boolean },
): Promise<GoalWithProgress[]> {
  const [activeGoals, macro] = await Promise.all([
    deps.goals.listForProfile(profileId, { status: "active" }),
    buildGoalMacro(deps, { userId, profileId }),
  ]);

  return Promise.all(
    activeGoals.map(async (goal) => {
      const { goal: resolvedGoal, macro: resolvedMacro } = await resolveGoalProgressInputs(
        deps,
        goal,
        macro,
        profileId,
      );
      const rawProgress = GoalProgressService.compute(resolvedGoal, resolvedMacro);
      const { progress, etaLocked } = gateEta(rawProgress, isPro);
      return { goal, progress, etaLocked };
    }),
  );
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
