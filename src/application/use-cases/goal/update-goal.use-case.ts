import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";

export interface UpdateGoalDeps {
  goals: GoalRepository;
}

export type UpdateGoalResult =
  | { ok: true; goal: GoalEntity }
  | { ok: false; message: string };

/**
 * Atualiza campos de uma meta existente do usuario. Verifica propriedade
 * antes de qualquer escrita.
 */
export async function updateGoal(
  { goals }: UpdateGoalDeps,
  {
    userId,
    goalId,
    patch,
  }: { userId: string; goalId: string; patch: Partial<GoalEntity> },
): Promise<UpdateGoalResult> {
  const existing = await goals.findById(goalId);
  if (!existing || existing.userId !== userId) {
    return { ok: false, message: "Meta não encontrada." };
  }

  const updated = await goals.update(goalId, patch);
  if (!updated) {
    return { ok: false, message: "Meta não encontrada." };
  }

  return { ok: true, goal: updated };
}
