import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import type {
  TopUserUsage,
  UsageRepository,
  UsageSummary,
  UserUsage,
} from "@/domain/ports/repositories/usage.repository";
import { dayKeyUTC, HEARTBEAT_INTERVAL_SECONDS, windowStartDayUTC } from "@/shared/usage";

import { getDb } from "../client";
import { usageDailyRollup } from "../schema/usage-daily-rollup.schema";
import { usageEvents } from "../schema/usage-events.schema";
import { users } from "../schema/users.schema";

export class DrizzleUsageRepository implements UsageRepository {
  async recordPing(userId: string, path: string | null, now: Date): Promise<void> {
    const db = getDb();
    const day = dayKeyUTC(now);
    await db.insert(usageEvents).values({ userId, path, occurredAt: now });
    await db
      .insert(usageDailyRollup)
      .values({
        userId,
        day,
        activeSeconds: HEARTBEAT_INTERVAL_SECONDS,
        pingCount: 1,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [usageDailyRollup.userId, usageDailyRollup.day],
        set: {
          activeSeconds: sql`LEAST(${usageDailyRollup.activeSeconds} + ${HEARTBEAT_INTERVAL_SECONDS}, 86400)`,
          pingCount: sql`${usageDailyRollup.pingCount} + 1`,
          lastSeenAt: now,
        },
      });
  }

  async getSummary(now: Date): Promise<UsageSummary> {
    const db = getDb();
    const countDistinct = async (days: number): Promise<number> => {
      const [row] = await db
        .select({ n: sql<string>`COUNT(DISTINCT ${usageDailyRollup.userId})` })
        .from(usageDailyRollup)
        .where(gte(usageDailyRollup.day, windowStartDayUTC(now, days)));
      return Number(row?.n ?? 0);
    };
    const [dau, wau, mau, avgRows] = await Promise.all([
      countDistinct(1),
      countDistinct(7),
      countDistinct(30),
      db.select({ avg: sql<string>`COALESCE(AVG(${usageDailyRollup.activeSeconds}), 0)` })
        .from(usageDailyRollup)
        .where(gte(usageDailyRollup.day, windowStartDayUTC(now, 30))),
    ]);
    const avgRow = avgRows[0];
    return { dau, wau, mau, avgDailyActiveSeconds30d: Math.round(Number(avgRow?.avg ?? 0)) };
  }

  async getUserUsage(userId: string, now: Date): Promise<UserUsage> {
    const map = await this.getUserUsageMap([userId], now);
    return map.get(userId) ?? { activeSeconds30d: 0, lastSeenAt: null };
  }

  async getUserUsageMap(userIds: string[], now: Date): Promise<Map<string, UserUsage>> {
    const map = new Map<string, UserUsage>();
    if (userIds.length === 0) return map;
    const rows = await getDb()
      .select({
        userId: usageDailyRollup.userId,
        seconds: sql<string>`COALESCE(SUM(${usageDailyRollup.activeSeconds}), 0)`,
        lastSeen: sql<Date | null>`MAX(${usageDailyRollup.lastSeenAt})`,
      })
      .from(usageDailyRollup)
      .where(
        and(
          inArray(usageDailyRollup.userId, userIds),
          gte(usageDailyRollup.day, windowStartDayUTC(now, 30)),
        ),
      )
      .groupBy(usageDailyRollup.userId);
    for (const r of rows) {
      map.set(r.userId, { activeSeconds30d: Number(r.seconds), lastSeenAt: r.lastSeen });
    }
    return map;
  }

  async listTopUsers(now: Date, limit: number): Promise<TopUserUsage[]> {
    const rows = await getDb()
      .select({
        userId: usageDailyRollup.userId,
        email: users.email,
        seconds: sql<string>`COALESCE(SUM(${usageDailyRollup.activeSeconds}), 0)`,
        lastSeen: sql<Date | null>`MAX(${usageDailyRollup.lastSeenAt})`,
      })
      .from(usageDailyRollup)
      .innerJoin(users, eq(users.id, usageDailyRollup.userId))
      .where(gte(usageDailyRollup.day, windowStartDayUTC(now, 30)))
      .groupBy(usageDailyRollup.userId, users.email)
      .orderBy(desc(sql`SUM(${usageDailyRollup.activeSeconds})`))
      .limit(limit);
    return rows.map((r) => ({
      userId: r.userId,
      email: r.email,
      activeSeconds30d: Number(r.seconds),
      lastSeenAt: r.lastSeen,
    }));
  }
}
