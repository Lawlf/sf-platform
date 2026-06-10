import { eq } from "drizzle-orm";

import type { PushSubscriptionEntity } from "@/domain/entities/push-subscription.entity";
import type { PushSubscriptionRepositoryPort } from "@/domain/ports/repositories/push-subscription.repository";

import { getDb } from "../client";
import { pushSubscriptions, type PushSubscriptionRow } from "../schema/push-subscriptions.schema";

function toEntity(row: PushSubscriptionRow): PushSubscriptionEntity {
  return {
    id: row.id,
    userId: row.userId,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.userAgent ?? null,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
  };
}

export class PushSubscriptionRepository implements PushSubscriptionRepositoryPort {
  async findByEndpoint(endpoint: string): Promise<PushSubscriptionEntity | null> {
    const rows = await getDb()
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async listForUser(userId: string): Promise<PushSubscriptionEntity[]> {
    const rows = await getDb()
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
    return rows.map(toEntity);
  }

  async upsert(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
  }): Promise<PushSubscriptionEntity> {
    const rows = await getDb()
      .insert(pushSubscriptions)
      .values({
        userId: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: input.userId,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
          lastSeenAt: new Date(),
        },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert push_subscription: no row returned");
    return toEntity(row);
  }

  async touchLastSeen(endpoint: string, at: Date): Promise<void> {
    await getDb()
      .update(pushSubscriptions)
      .set({ lastSeenAt: at })
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await getDb().delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deleteForUser(userId: string): Promise<void> {
    await getDb().delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }
}
