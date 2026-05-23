import { and, eq, sql } from "drizzle-orm";

import type {
  PaymentProvider,
  Subscription,
} from "@/domain/entities/subscription.entity";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";

import { getDb } from "../client";
import { type SubscriptionRow, subscriptions } from "../schema/subscriptions.schema";

const ACTIVE_STATUSES = ["active", "past_due", "incomplete"] as const;

function toEntity(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    provider: row.provider,
    providerSubscriptionId: row.providerSubscriptionId,
    providerCustomerId: row.providerCustomerId,
    status: row.status,
    priceCents: row.priceCents,
    currency: row.currency,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    canceledAt: row.canceledAt,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleSubscriptionRepository implements SubscriptionRepository {
  async findById(id: string): Promise<Subscription | null> {
    const rows = await getDb()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByProviderSubscriptionId(
    provider: PaymentProvider,
    providerSubscriptionId: string,
  ): Promise<Subscription | null> {
    const rows = await getDb()
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.provider, provider),
          eq(subscriptions.providerSubscriptionId, providerSubscriptionId),
        ),
      )
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    const rows = await getDb()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(50);
    const active = rows.find((r) =>
      ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number]),
    );
    return active ? toEntity(active) : null;
  }

  async findAllByUserId(userId: string): Promise<Subscription[]> {
    const rows = await getDb()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return rows.map(toEntity);
  }

  async countByPlanId(planId: string): Promise<number> {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.planId, planId));
    return rows[0]?.count ?? 0;
  }

  async save(sub: Subscription): Promise<void> {
    await getDb()
      .insert(subscriptions)
      .values({
        id: sub.id,
        userId: sub.userId,
        planId: sub.planId,
        provider: sub.provider,
        providerSubscriptionId: sub.providerSubscriptionId,
        providerCustomerId: sub.providerCustomerId,
        status: sub.status,
        priceCents: sub.priceCents,
        currency: sub.currency,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        canceledAt: sub.canceledAt,
        endedAt: sub.endedAt,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })
      .onConflictDoUpdate({
        target: subscriptions.id,
        set: {
          planId: sub.planId,
          status: sub.status,
          providerSubscriptionId: sub.providerSubscriptionId,
          providerCustomerId: sub.providerCustomerId,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          canceledAt: sub.canceledAt,
          endedAt: sub.endedAt,
          updatedAt: sub.updatedAt,
        },
      });
  }
}
