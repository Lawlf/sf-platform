"use server";

import { revalidatePath } from "next/cache";

import { mapStripeInvoice } from "@/infrastructure/billing/stripe/mappers/stripe-invoice.mapper";
import { getStripeClient } from "@/infrastructure/billing/stripe/stripe-client";
import { DrizzlePaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-payment.repository";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export interface RefreshPaymentsResult {
  ok: boolean;
  created: number;
  message?: string;
}

export async function refreshPaymentsAction(): Promise<RefreshPaymentsResult> {
  const user = await requireUser();
  const subRepo = new DrizzleSubscriptionRepository();
  const paymentRepo = new DrizzlePaymentRepository();
  const sub = await subRepo.findActiveByUserId(user.id);

  if (!sub || sub.provider !== "stripe" || !sub.providerSubscriptionId) {
    return { ok: true, created: 0 };
  }

  try {
    const stripe = getStripeClient();
    const invoiceList = await stripe.invoices.list({
      subscription: sub.providerSubscriptionId,
      limit: 100,
    });
    let created = 0;
    const now = new Date();
    for (const inv of invoiceList.data) {
      if (!inv.id) continue;
      const existing = await paymentRepo.findByProviderPaymentId("stripe", inv.id);
      if (existing) continue;
      const snapshot = mapStripeInvoice(inv);
      await paymentRepo.save({
        id: crypto.randomUUID(),
        subscriptionId: sub.id,
        userId: user.id,
        provider: "stripe",
        providerPaymentId: snapshot.providerPaymentId,
        amountCents: snapshot.amountCents,
        currency: snapshot.currency,
        status: snapshot.status === "paid" ? "succeeded" : "pending",
        paymentMethod: snapshot.paymentMethod,
        gatewayFeeCents: snapshot.gatewayFeeCents,
        paidAt: snapshot.paidAt,
        failedAt: null,
        failureReason: null,
        hostedInvoiceUrl: snapshot.hostedInvoiceUrl,
        createdAt: now,
      });
      created += 1;
    }
    revalidatePath("/app/configuracoes/planos");
    return { ok: true, created };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[refresh-payments] failure:", e);
    return { ok: false, created: 0, message: msg };
  }
}
