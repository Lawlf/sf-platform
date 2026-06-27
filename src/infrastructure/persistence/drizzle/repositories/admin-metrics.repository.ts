import { and, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";

import { monthlyCentsFor } from "@/application/use-cases/admin/mrr";
import type { Payment } from "@/domain/entities/payment.entity";
import type {
  AcquisitionBreakdown,
  AdminMetricsRepositoryPort,
  AdminMetricsSummary,
  DailyPoint,
} from "@/domain/ports/repositories/admin-metrics.repository";

import { getDb } from "../client";
import { payments } from "../schema/payments.schema";
import { plans } from "../schema/plans.schema";
import { subscriptions } from "../schema/subscriptions.schema";
import { users } from "../schema/users.schema";

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function toEntity(row: typeof payments.$inferSelect): Payment {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    userId: row.userId,
    provider: row.provider,
    providerPaymentId: row.providerPaymentId,
    amountCents: row.amountCents,
    currency: row.currency,
    status: row.status,
    paymentMethod: row.paymentMethod,
    gatewayFeeCents: row.gatewayFeeCents,
    paidAt: row.paidAt,
    failedAt: row.failedAt,
    failureReason: row.failureReason,
    hostedInvoiceUrl: row.hostedInvoiceUrl,
    createdAt: row.createdAt,
  };
}

export class AdminMetricsRepository implements AdminMetricsRepositoryPort {
  async getSummary(now: Date): Promise<AdminMetricsSummary> {
    const db = getDb();
    const since30 = daysAgo(now, 30);

    // MRR: active stripe subs, monthly-normalized via plan interval in TS
    // (DRY: reuses monthlyCentsFor). Manual/cortesia excluded by provider filter.
    // interval may be null when the plan row was deleted -> treat as "month".
    const activeStripe = await db
      .select({ priceCents: subscriptions.priceCents, interval: plans.billingInterval })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.status, "active"), eq(subscriptions.provider, "stripe")));
    const mrrCents = activeStripe.reduce(
      (acc, r) => acc + monthlyCentsFor(r.interval ?? "month", r.priceCents),
      0n,
    );

    const [rev30] = await db
      .select({ cents: sql<string>`COALESCE(SUM(${payments.amountCents}), 0)` })
      .from(payments)
      .where(and(eq(payments.status, "succeeded"), gte(payments.paidAt, since30)));

    const [revTotal] = await db
      .select({ cents: sql<string>`COALESCE(SUM(${payments.amountCents}), 0)` })
      .from(payments)
      .where(eq(payments.status, "succeeded"));

    const [proRow] = await db
      .select({ n: sql<string>`COUNT(*)` })
      .from(users)
      .where(eq(users.isPro, true));

    const [freeRow] = await db
      .select({ n: sql<string>`COUNT(*)` })
      .from(users)
      .where(eq(users.isPro, false));

    const [churnRow] = await db
      .select({ n: sql<string>`COUNT(*)` })
      .from(subscriptions)
      .where(and(isNotNull(subscriptions.canceledAt), gte(subscriptions.canceledAt, since30)));

    const [failRow] = await db
      .select({ n: sql<string>`COUNT(*)` })
      .from(payments)
      .where(and(eq(payments.status, "failed"), isNotNull(payments.failedAt), gte(payments.failedAt, since30)));

    const proCount = Number(proRow?.n ?? 0);
    const freeCount = Number(freeRow?.n ?? 0);
    const total = proCount + freeCount;

    return {
      mrrCents,
      revenue30dCents: BigInt(rev30?.cents ?? "0"),
      revenueTotalCents: BigInt(revTotal?.cents ?? "0"),
      proCount,
      freeCount,
      conversionRate: total === 0 ? 0 : proCount / total,
      churn30d: Number(churnRow?.n ?? 0),
      failedPayments30d: Number(failRow?.n ?? 0),
    };
  }

  async getRevenueSeries(now: Date, days: number): Promise<DailyPoint[]> {
    const db = getDb();
    const since = daysAgo(now, days);
    const rows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${payments.paidAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
        value: sql<string>`COALESCE(SUM(${payments.amountCents}), 0)`,
      })
      .from(payments)
      .where(and(eq(payments.status, "succeeded"), gte(payments.paidAt, since)))
      .groupBy(sql`date_trunc('day', ${payments.paidAt} AT TIME ZONE 'UTC')`)
      .orderBy(sql`date_trunc('day', ${payments.paidAt} AT TIME ZONE 'UTC')`);
    return rows.map((r) => ({ day: r.day, value: Number(r.value) }));
  }

  async getSignupSeries(now: Date, days: number): Promise<DailyPoint[]> {
    const db = getDb();
    const since = daysAgo(now, days);
    const rows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${users.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
        value: sql<string>`COUNT(*)`,
      })
      .from(users)
      .where(gte(users.createdAt, since))
      .groupBy(sql`date_trunc('day', ${users.createdAt} AT TIME ZONE 'UTC')`)
      .orderBy(sql`date_trunc('day', ${users.createdAt} AT TIME ZONE 'UTC')`);
    return rows.map((r) => ({ day: r.day, value: Number(r.value) }));
  }

  async getAcquisitionBreakdown(): Promise<AcquisitionBreakdown> {
    const db = getDb();

    const channelRows = await db
      .select({
        channel: users.acquisitionChannel,
        n: sql<string>`COUNT(*)`,
      })
      .from(users)
      .where(isNotNull(users.acquisitionChannel))
      .groupBy(users.acquisitionChannel)
      .orderBy(desc(sql`COUNT(*)`));

    const [unansweredRow] = await db
      .select({ n: sql<string>`COUNT(*)` })
      .from(users)
      .where(isNull(users.acquisitionChannel));

    const otherRows = await db
      .select({ detail: users.acquisitionChannelOther })
      .from(users)
      .where(isNotNull(users.acquisitionChannelOther))
      .orderBy(desc(users.createdAt));

    return {
      byChannel: channelRows.map((r) => ({ channel: r.channel ?? "", count: Number(r.n) })),
      unanswered: Number(unansweredRow?.n ?? 0),
      otherDetails: otherRows.map((r) => r.detail).filter((d): d is string => d !== null),
    };
  }

  async listRecentPayments(limit: number): Promise<Payment[]> {
    const rows = await getDb()
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(limit);
    return rows.map(toEntity);
  }
}
