import { and, desc, eq, ilike } from "drizzle-orm";

import type { PaymentProvider } from "@/domain/entities/subscription.entity";
import { repos } from "@/infrastructure/container";
import { getDb } from "@/infrastructure/persistence/drizzle/client";
import { subscriptions } from "@/infrastructure/persistence/drizzle/schema/subscriptions.schema";
import { users } from "@/infrastructure/persistence/drizzle/schema/users.schema";

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  isPro: boolean;
  plan: "free" | "pro";
  subProvider: PaymentProvider | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  activeSeconds30d: number;
  lastSeenAt: Date | null;
}

/** Searches users by email substring (case-insensitive). Empty query → most recent signups. */
export async function searchUsers(query: string, limit = 25): Promise<AdminUserRow[]> {
  const db = getDb();
  const base = db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      isPro: users.isPro,
      plan: users.plan,
      subProvider: subscriptions.provider,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(
      subscriptions,
      and(eq(subscriptions.userId, users.id), eq(subscriptions.status, "active")),
    );

  const dbRows = query.trim()
    ? await base.where(ilike(users.email, `%${query.trim()}%`)).orderBy(desc(users.createdAt)).limit(limit)
    : await base.orderBy(desc(users.createdAt)).limit(limit);

  const rows: AdminUserRow[] = dbRows.map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.displayName,
    isPro: r.isPro,
    plan: r.plan,
    subProvider: r.subProvider,
    currentPeriodEnd: r.currentPeriodEnd,
    createdAt: r.createdAt,
    activeSeconds30d: 0,
    lastSeenAt: null,
  }));

  const now = new Date();
  const usageMap = await repos.usage.getUserUsageMap(
    rows.map((r) => r.id),
    now,
  );

  for (const row of rows) {
    const usage = usageMap.get(row.id);
    if (usage !== undefined) {
      row.activeSeconds30d = usage.activeSeconds30d;
      row.lastSeenAt = usage.lastSeenAt;
    }
  }

  return rows;
}
