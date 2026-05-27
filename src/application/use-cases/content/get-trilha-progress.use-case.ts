import type { ModuleProgressRepository } from "@/domain/ports/repositories/module-progress.repository";

export interface GetTrilhaProgressInput {
  userId: string;
  trilhaSlug: string;
}

export interface TrilhaProgress {
  completedNums: number[];
}

export interface GetTrilhaProgressDeps {
  progress: Pick<ModuleProgressRepository, "findCompletedNums">;
}

export async function getTrilhaProgress(
  deps: GetTrilhaProgressDeps,
  input: GetTrilhaProgressInput,
): Promise<TrilhaProgress> {
  const completedNums = await deps.progress.findCompletedNums(input.userId, input.trilhaSlug);
  return { completedNums };
}
