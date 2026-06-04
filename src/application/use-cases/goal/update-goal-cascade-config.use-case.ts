import type { GoalCascadeMode, GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";

export interface UpdateGoalCascadeConfigDeps {
  goals: GoalRepository;
}

export type UpdateGoalCascadeConfigResult =
  | { ok: true; goal: GoalEntity }
  | { ok: false; message: string };

export async function updateGoalCascadeConfig(
  { goals }: UpdateGoalCascadeConfigDeps,
  {
    userId,
    goalId,
    isPro,
    mode,
    order,
    parallelFraction,
  }: {
    userId: string;
    goalId: string;
    isPro: boolean;
    mode: GoalCascadeMode;
    order: number;
    parallelFraction: number;
  },
): Promise<UpdateGoalCascadeConfigResult> {
  const existing = await goals.findById(goalId);
  if (!existing || existing.userId !== userId) {
    return { ok: false, message: "Meta não encontrada." };
  }

  if (!isPro) {
    return { ok: false, message: "Configurar a cascata é um recurso Pro." };
  }

  const updated = await goals.update(goalId, {
    cascadeMode: mode,
    cascadeOrder: order,
    cascadeParallelPct: parallelFraction,
  });
  if (!updated) {
    return { ok: false, message: "Meta não encontrada." };
  }

  return { ok: true, goal: updated };
}
