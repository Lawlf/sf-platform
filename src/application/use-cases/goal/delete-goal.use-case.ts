import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";

export interface DeleteGoalDeps {
  goals: GoalRepositoryPort;
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
  { userId, profileId, goalId }: { userId: string; profileId: string; goalId: string },
): Promise<DeleteGoalResult> {
  const existing = await goals.findById(goalId);
  if (!existing || existing.profileId !== profileId) {
    return { ok: false, message: "Meta não encontrada." };
  }

  await goals.softDelete(goalId);

  return { ok: true };
}
