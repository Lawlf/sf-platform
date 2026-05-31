import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";

export interface ArchiveGoalDeps {
  goals: GoalRepository;
}

export type ArchiveGoalResult =
  | { ok: true; goal: GoalEntity }
  | { ok: false; message: string };

/**
 * Arquiva uma meta ativa do usuario. Verifica propriedade antes de escrever.
 */
export async function archiveGoal(
  { goals }: ArchiveGoalDeps,
  { userId, goalId }: { userId: string; goalId: string },
): Promise<ArchiveGoalResult> {
  const existing = await goals.findById(goalId);
  if (!existing || existing.userId !== userId) {
    return { ok: false, message: "Meta não encontrada." };
  }

  const updated = await goals.update(goalId, { status: "archived" });
  if (!updated) {
    return { ok: false, message: "Meta não encontrada." };
  }

  return { ok: true, goal: updated };
}
