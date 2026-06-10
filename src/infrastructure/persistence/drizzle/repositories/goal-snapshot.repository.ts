import { asc, eq } from "drizzle-orm";

import type { GoalSnapshotEntity } from "@/domain/entities/goal-snapshot.entity";
import type { GoalSnapshotRepositoryPort } from "@/domain/ports/repositories/goal-snapshot.repository";

import { getDb } from "../client";
import {
  goalSnapshots,
  type GoalSnapshotRow,
} from "../schema/goal-snapshots.schema";

function rowToEntity(row: GoalSnapshotRow): GoalSnapshotEntity {
  return {
    goalId: row.goalId,
    month: row.month,
    currentCents: row.currentCents,
    targetCents: row.targetCents,
    capturedAt: row.capturedAt,
  };
}

export class GoalSnapshotRepository implements GoalSnapshotRepositoryPort {
  async upsert(snapshot: GoalSnapshotEntity): Promise<void> {
    await getDb()
      .insert(goalSnapshots)
      .values({
        goalId: snapshot.goalId,
        month: snapshot.month,
        currentCents: snapshot.currentCents,
        targetCents: snapshot.targetCents,
        capturedAt: snapshot.capturedAt,
      })
      .onConflictDoUpdate({
        target: [goalSnapshots.goalId, goalSnapshots.month],
        set: {
          currentCents: snapshot.currentCents,
          targetCents: snapshot.targetCents,
          capturedAt: snapshot.capturedAt,
        },
      });
  }

  async listForGoal(goalId: string): Promise<GoalSnapshotEntity[]> {
    const rows = await getDb()
      .select()
      .from(goalSnapshots)
      .where(eq(goalSnapshots.goalId, goalId))
      .orderBy(asc(goalSnapshots.month));
    return rows.map(rowToEntity);
  }
}
