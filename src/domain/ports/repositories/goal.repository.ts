import type { GoalEntity, GoalStatus } from "@/domain/entities/goal.entity";

export interface GoalRepository {
  create(goal: Omit<GoalEntity, "createdAt" | "updatedAt">): Promise<GoalEntity>;
  update(id: string, patch: Partial<GoalEntity>): Promise<GoalEntity | null>;
  findById(id: string): Promise<GoalEntity | null>;
  listForUser(userId: string, opts?: { status?: GoalStatus }): Promise<GoalEntity[]>;
  countActive(userId: string): Promise<number>;
  softDelete(id: string): Promise<void>;
  /** Todas as metas ativas de todos os usuarios (cron). */
  listAllActive(): Promise<GoalEntity[]>;
}
