"use server";

import { z } from "zod";

import { mapStripeInvoice } from "@/infrastructure/billing/stripe/mappers/stripe-invoice.mapper";
import { getStripeClient } from "@/infrastructure/billing/stripe/stripe-client";
import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";

export const refreshPaymentsAction = action({
  schema: z.void(),
  revalidates: ["billing"],
  handler: async (_input, { userId }) => {
    const sub = await repos.subscriptions.findActiveByUserId(userId);

    if (!sub || sub.provider !== "stripe" || !sub.providerSubscriptionId) {
      return { created: 0 };
    }

    const stripe = getStripeClient();
    const invoiceList = await stripe.invoices.list({
      subscription: sub.providerSubscriptionId,
      limit: 100,
    });
    let created = 0;
    const now = new Date();
    for (const inv of invoiceList.data) {
      if (!inv.id) continue;
      const existing = await repos.payments.findByProviderPaymentId("stripe", inv.id);
      if (existing) continue;
      const snapshot = mapStripeInvoice(inv);
      await repos.payments.save({
        id: crypto.randomUUID(),
        subscriptionId: sub.id,
        userId,
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
    return { created };
  },
});
