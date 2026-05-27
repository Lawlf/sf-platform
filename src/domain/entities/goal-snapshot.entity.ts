export interface GoalSnapshotEntity {
  goalId: string;
  /** Primeiro dia do mes (UTC). */
  month: Date;
  currentCents: bigint;
  targetCents: bigint;
  capturedAt: Date;
}
