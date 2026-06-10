import type { GoalSnapshotEntity } from "@/domain/entities/goal-snapshot.entity";

export interface GoalSnapshotRepositoryPort {
  upsert(snapshot: GoalSnapshotEntity): Promise<void>;
  listForGoal(goalId: string): Promise<GoalSnapshotEntity[]>;
}
