import type { Clock } from "@/domain/ports/clock.port";
import type { AchievementProgressRepository } from "@/domain/ports/repositories/achievement-progress.repository";

import {
  recomputeDerivedAchievementsForUser,
  type SustainedEvaluation,
} from "./recompute-derived-achievements.use-case";

export interface RunAchievementsRecomputeDeps {
  listRecentlyActiveUserIds: (now: Date, days: number) => Promise<string[]>;
  listActiveMonthIsos: (userId: string) => Promise<string[]>;
  progress: AchievementProgressRepository;
  clock: Clock;
  award: (userId: string, slug: string) => Promise<void>;
  evaluate: (userId: string) => Promise<SustainedEvaluation>;
  reconcileEvents: (userId: string) => Promise<void>;
}

const ACTIVE_WINDOW_DAYS = 40;

export async function runAchievementsRecompute(
  deps: RunAchievementsRecomputeDeps,
  now: Date,
): Promise<{ usersProcessed: number }> {
  const userIds = await deps.listRecentlyActiveUserIds(now, ACTIVE_WINDOW_DAYS);
  for (const userId of userIds) {
    try {
      await deps.reconcileEvents(userId);
      const activeMonths = await deps.listActiveMonthIsos(userId);
      await recomputeDerivedAchievementsForUser(
        {
          progress: deps.progress,
          clock: deps.clock,
          award: deps.award,
          activeMonths,
          evaluate: deps.evaluate,
        },
        userId,
      );
    } catch (error) {
      console.error("[achievements.recompute] usuário falhou", userId, error);
    }
  }
  return { usersProcessed: userIds.length };
}
