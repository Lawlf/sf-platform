import type { GoalEntity, GoalStatus } from "@/domain/entities/goal.entity";

export interface GoalRepositoryPort {
  create(goal: Omit<GoalEntity, "createdAt" | "updatedAt">): Promise<GoalEntity>;
  update(id: string, patch: Partial<GoalEntity>): Promise<GoalEntity | null>;
  findById(id: string): Promise<GoalEntity | null>;
  listForProfile(profileId: string, opts?: { status?: GoalStatus }): Promise<GoalEntity[]>;
  listForHousehold(householdId: string): Promise<GoalEntity[]>;
  findByIdInHousehold(goalId: string, householdId: string): Promise<GoalEntity | null>;
  countActive(profileId: string): Promise<number>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  listAllActive(): Promise<GoalEntity[]>;
}
