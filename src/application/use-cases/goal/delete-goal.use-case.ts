import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";

export interface DeleteGoalDeps {
  goals: GoalRepository;
}

export type DeleteGoalResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Remove (soft delete) uma meta do usuario. Verifica propriedade antes de
 * escrever.
 */
export async function deleteGoal(
  { goals }: DeleteGoalDeps,
  { userId, goalId }: { userId: string; goalId: string },
): Promise<DeleteGoalResult> {
  const existing = await goals.findById(goalId);
  if (!existing || existing.userId !== userId) {
    return { ok: false, message: "Meta nao encontrada." };
  }

  await goals.softDelete(goalId);

  return { ok: true };
}
