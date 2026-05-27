import type { GoalSnapshotEntity } from "@/domain/entities/goal-snapshot.entity";

export interface GoalSnapshotRepository {
  upsert(snapshot: GoalSnapshotEntity): Promise<void>;
  listForGoal(goalId: string): Promise<GoalSnapshotEntity[]>;
}
