import type { GoalSnapshotRepository } from "@/domain/ports/repositories/goal-snapshot.repository";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";
import type { GoalMacro } from "@/domain/services/goal-progress.service";
import { GoalProgressService } from "@/domain/services/goal-progress.service";

export interface CaptureGoalSnapshotsDeps {
  goals: Pick<GoalRepository, "listAllActive" | "update">;
  snapshots: Pick<GoalSnapshotRepository, "upsert">;
  /** Injected factory so callers and tests can provide any macro source. */
  buildMacro: (userId: string) => Promise<GoalMacro>;
}

export interface CaptureGoalSnapshotsInput {
  now: Date;
}

export interface ReachedGoal {
  goalId: string;
  userId: string;
  title: string;
}

export interface CaptureGoalSnapshotsResult {
  snapshotsWritten: number;
  reached: ReachedGoal[];
}

/** Returns the first day of the month for `date`, at midnight UTC. */
function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Cron mensal. Para cada meta ativa:
 * - calcula o progresso via GoalProgressService,
 * - persiste um snapshot do mes,
 * - se a meta foi atingida, atualiza o status para "reached".
 *
 * Retorna os snapshots gravados e as metas que acabaram de ser atingidas
 * (para que o chamador possa disparar as push notifications).
 */
export async function captureGoalSnapshots(
  deps: CaptureGoalSnapshotsDeps,
  input: CaptureGoalSnapshotsInput,
): Promise<CaptureGoalSnapshotsResult> {
  const { now } = input;
  const month = firstOfMonth(now);

  const active = await deps.goals.listAllActive();
  if (active.length === 0) {
    return { snapshotsWritten: 0, reached: [] };
  }

  // Group goals by userId so we call buildMacro only once per user.
  const byUser = new Map<string, typeof active>();
  for (const goal of active) {
    const bucket = byUser.get(goal.userId) ?? [];
    bucket.push(goal);
    byUser.set(goal.userId, bucket);
  }

  let snapshotsWritten = 0;
  const reached: ReachedGoal[] = [];

  for (const [userId, goals] of byUser) {
    const macro = await deps.buildMacro(userId);

    for (const goal of goals) {
      const progress = GoalProgressService.compute(goal, macro);

      await deps.snapshots.upsert({
        goalId: goal.id,
        month,
        currentCents: progress.currentCents,
        targetCents: progress.targetCents,
        capturedAt: now,
      });
      snapshotsWritten++;

      if (progress.reached && goal.status === "active") {
        await deps.goals.update(goal.id, { status: "reached" });
        reached.push({ goalId: goal.id, userId, title: goal.title });
      }
    }
  }

  return { snapshotsWritten, reached };
}
