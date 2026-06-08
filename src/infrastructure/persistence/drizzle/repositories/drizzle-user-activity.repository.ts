import { and, eq, gte, isNull, lt, lte } from "drizzle-orm";

import type {
  LiteUser,
  UserActivityRepository,
} from "@/domain/ports/repositories/user-activity.repository";

import { getDb } from "../client";
import { users } from "../schema/users.schema";

export class DrizzleUserActivityRepository implements UserActivityRepository {
  async touchLastActive(userId: string, now: Date, staleAfterMs: number): Promise<void> {
    const threshold = new Date(now.getTime() - staleAfterMs);
    await getDb()
      .update(users)
      .set({ lastActiveAt: now })
      .where(and(eq(users.id, userId), lt(users.lastActiveAt, threshold)));
  }

  async findActiveSince(since: Date): Promise<LiteUser[]> {
    const rows = await getDb()
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(and(isNull(users.deactivatedAt), gte(users.lastActiveAt, since)));
    return rows;
  }

  async findLapsed(start: Date, end: Date): Promise<LiteUser[]> {
    const rows = await getDb()
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(
        and(
          isNull(users.deactivatedAt),
          gte(users.lastActiveAt, start),
          lt(users.lastActiveAt, end),
        ),
      );
    return rows;
  }

  async findEngagedFreeUsers(opts: {
    activeSince: Date;
    createdBefore: Date;
  }): Promise<LiteUser[]> {
    const rows = await getDb()
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(
        and(
          isNull(users.deactivatedAt),
          eq(users.isPro, false),
          gte(users.lastActiveAt, opts.activeSince),
          lte(users.createdAt, opts.createdBefore),
        ),
      );
    return rows;
  }
}
