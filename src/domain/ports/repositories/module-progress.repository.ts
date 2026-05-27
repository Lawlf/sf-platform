import type { ModuleProgressEntity } from "@/domain/entities/module-progress.entity";

export interface MarkModuleCompletedInput {
  userId: string;
  trilhaSlug: string;
  moduleNum: number;
  completedAt: Date;
}

export interface ModuleProgressRepository {
  markCompleted(input: MarkModuleCompletedInput): Promise<ModuleProgressEntity>;
  findCompletedNums(userId: string, trilhaSlug: string): Promise<number[]>;
}
