import { eq, sql } from "drizzle-orm";

import type { UserAvatarRepository } from "@/domain/ports/repositories/user-avatar.repository";

import { getDb } from "../client";
import { userAvatars } from "../schema/user-avatars.schema";

export class DrizzleUserAvatarRepository implements UserAvatarRepository {
  async get(userId: string): Promise<string | null> {
    const rows = await getDb()
      .select({ dataUrl: userAvatars.dataUrl })
      .from(userAvatars)
      .where(eq(userAvatars.userId, userId))
      .limit(1);
    return rows[0]?.dataUrl ?? null;
  }

  async upsert(userId: string, dataUrl: string): Promise<void> {
    await getDb()
      .insert(userAvatars)
      .values({ userId, dataUrl })
      .onConflictDoUpdate({
        target: userAvatars.userId,
        set: { dataUrl, updatedAt: sql`now()` },
      });
  }

  async delete(userId: string): Promise<void> {
    await getDb().delete(userAvatars).where(eq(userAvatars.userId, userId));
  }
}
