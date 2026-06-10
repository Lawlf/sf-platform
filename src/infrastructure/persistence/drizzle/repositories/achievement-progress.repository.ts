import { and, eq } from "drizzle-orm";

import type {
  AchievementProgressRepositoryPort,
  AchievementProgressState,
} from "@/domain/ports/repositories/achievement-progress.repository";

import { getDb } from "../client";
import { achievementProgress } from "../schema/achievement-progress.schema";

export class AchievementProgressRepository implements AchievementProgressRepositoryPort {
  async get(userId: string, slug: string): Promise<AchievementProgressState | null> {
    const rows = await getDb()
      .select()
      .from(achievementProgress)
      .where(and(eq(achievementProgress.userId, userId), eq(achievementProgress.slug, slug)))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return { qualifiedMonths: r.qualifiedMonths, lastQualifiedMonth: r.lastQualifiedMonth };
  }

  async set(
    userId: string,
    slug: string,
    state: AchievementProgressState,
    updatedAt: Date,
  ): Promise<void> {
    await getDb()
      .insert(achievementProgress)
      .values({
        userId,
        slug,
        qualifiedMonths: state.qualifiedMonths,
        lastQualifiedMonth: state.lastQualifiedMonth,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [achievementProgress.userId, achievementProgress.slug],
        set: {
          qualifiedMonths: state.qualifiedMonths,
          lastQualifiedMonth: state.lastQualifiedMonth,
          updatedAt,
        },
      });
  }
}
