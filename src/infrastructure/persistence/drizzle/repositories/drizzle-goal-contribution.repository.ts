import { desc, eq } from "drizzle-orm";

import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";
import type { GoalContributionRepository } from "@/domain/ports/repositories/goal-contribution.repository";

import { getDb } from "../client";
import {
  goalContributions,
  type GoalContributionRow,
} from "../schema/goal-contributions.schema";

function rowToEntity(row: GoalContributionRow): GoalContributionEntity {
  return {
    id: row.id,
    goalId: row.goalId,
    userId: row.userId,
    amountCents: row.amountCents,
    createdAt: row.createdAt,
  };
}

export class DrizzleGoalContributionRepository
  implements GoalContributionRepository
{
  async add(contribution: GoalContributionEntity): Promise<void> {
    await getDb().insert(goalContributions).values({
      id: contribution.id,
      goalId: contribution.goalId,
      userId: contribution.userId,
      amountCents: contribution.amountCents,
      createdAt: contribution.createdAt,
    });
  }

  async listForGoal(
    goalId: string,
    limit: number,
  ): Promise<GoalContributionEntity[]> {
    const rows = await getDb()
      .select()
      .from(goalContributions)
      .where(eq(goalContributions.goalId, goalId))
      .orderBy(desc(goalContributions.createdAt))
      .limit(limit);
    return rows.map(rowToEntity);
  }
}
