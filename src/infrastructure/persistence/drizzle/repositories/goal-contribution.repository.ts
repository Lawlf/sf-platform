import { desc, eq } from "drizzle-orm";

import type { GoalContributionEntity } from "@/domain/entities/goal-contribution.entity";
import type { GoalContributionRepositoryPort } from "@/domain/ports/repositories/goal-contribution.repository";

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
    profileId: row.profileId,
    amountCents: row.amountCents,
    createdAt: row.createdAt,
  };
}

export class GoalContributionRepository
  implements GoalContributionRepositoryPort
{
  async add(contribution: GoalContributionEntity): Promise<void> {
    await getDb().insert(goalContributions).values({
      id: contribution.id,
      goalId: contribution.goalId,
      userId: contribution.userId,
      profileId: contribution.profileId,
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
