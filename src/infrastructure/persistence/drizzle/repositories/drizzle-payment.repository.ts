import { and, count, desc, eq } from "drizzle-orm";

import type { Payment } from "@/domain/entities/payment.entity";
import type { PaymentProvider } from "@/domain/entities/subscription.entity";
import type { PaymentRepository } from "@/domain/ports/repositories/payment.repository";

import { getDb } from "../client";
import { type PaymentRow, payments } from "../schema/payments.schema";

function toEntity(row: PaymentRow): Payment {
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

export class DrizzlePaymentRepository implements PaymentRepository {
  async findById(id: string): Promise<Payment | null> {
    const rows = await getDb().select().from(payments).where(eq(payments.id, id)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByProviderPaymentId(
    provider: PaymentProvider,
    providerPaymentId: string,
  ): Promise<Payment | null> {
    const rows = await getDb()
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.provider, provider),
          eq(payments.providerPaymentId, providerPaymentId),
        ),
      )
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Payment[]> {
    const rows = await getDb()
      .select()
      .from(payments)
      .where(eq(payments.subscriptionId, subscriptionId))
      .orderBy(desc(payments.createdAt));
    return rows.map(toEntity);
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Payment[]> {
    const rows = await getDb()
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(toEntity);
  }

  async countByUserId(userId: string): Promise<number> {
    const rows = await getDb()
      .select({ value: count() })
      .from(payments)
      .where(eq(payments.userId, userId));
    return Number(rows[0]?.value ?? 0);
  }

  async save(p: Payment): Promise<void> {
    await getDb()
      .insert(payments)
      .values({
        id: p.id,
        subscriptionId: p.subscriptionId,
        userId: p.userId,
        provider: p.provider,
        providerPaymentId: p.providerPaymentId,
        amountCents: p.amountCents,
        currency: p.currency,
        status: p.status,
        paymentMethod: p.paymentMethod,
        gatewayFeeCents: p.gatewayFeeCents,
        paidAt: p.paidAt,
        failedAt: p.failedAt,
        failureReason: p.failureReason,
        hostedInvoiceUrl: p.hostedInvoiceUrl,
        createdAt: p.createdAt,
      })
      .onConflictDoUpdate({
        target: payments.id,
        set: {
          status: p.status,
          paymentMethod: p.paymentMethod,
          gatewayFeeCents: p.gatewayFeeCents,
          paidAt: p.paidAt,
          failedAt: p.failedAt,
          failureReason: p.failureReason,
          hostedInvoiceUrl: p.hostedInvoiceUrl,
        },
      });
  }
}
