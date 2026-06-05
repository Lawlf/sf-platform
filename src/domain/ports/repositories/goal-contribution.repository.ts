import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";

export interface GoalContributionRepository {
  add(contribution: GoalContributionEntity): Promise<void>;
  listForGoal(goalId: string, limit: number): Promise<GoalContributionEntity[]>;
}
