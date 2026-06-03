import { and, eq } from "drizzle-orm";

import type { UserAchievementEntity } from "@/domain/entities/user-achievement.entity";
import type { UserAchievementRepository } from "@/domain/ports/repositories/user-achievement.repository";

import { getDb } from "../client";
import { userAchievements } from "../schema/user-achievements.schema";

export class DrizzleUserAchievementRepository implements UserAchievementRepository {
  async unlock(
    userId: string,
    slug: string,
    unlockedAt: Date,
    payload: Record<string, unknown> = {},
  ): Promise<boolean> {
    const rows = await getDb()
      .insert(userAchievements)
      .values({ userId, slug, unlockedAt, payload })
      .onConflictDoNothing({ target: [userAchievements.userId, userAchievements.slug] })
      .returning({ slug: userAchievements.slug });
    return rows.length > 0;
  }

  async listForUser(userId: string): Promise<UserAchievementEntity[]> {
    const rows = await getDb()
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));
    return rows.map((r) => ({
      userId: r.userId,
      slug: r.slug,
      unlockedAt: r.unlockedAt,
      payload: (r.payload ?? {}) as Record<string, unknown>,
    }));
  }

  async hasUnlocked(userId: string, slug: string): Promise<boolean> {
    const rows = await getDb()
      .select({ slug: userAchievements.slug })
      .from(userAchievements)
      .where(and(eq(userAchievements.userId, userId), eq(userAchievements.slug, slug)))
      .limit(1);
    return rows.length > 0;
  }
}
