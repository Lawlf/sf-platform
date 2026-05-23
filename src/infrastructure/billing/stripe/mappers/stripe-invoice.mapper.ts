import type Stripe from "stripe";

import type { ProviderInvoiceSnapshot } from "@/domain/ports/external/billing-provider.port";

function subscriptionIdOf(inv: Stripe.Invoice): string {
  // Newer SDK keeps `subscription` as string id (or undefined). We coerce null/undefined to "".
  const sub = (inv as unknown as { subscription?: string | Stripe.Subscription | null }).subscription;
  if (!sub) return "";
  return typeof sub === "string" ? sub : sub.id;
}

function customerIdOf(inv: Stripe.Invoice): string {
  if (!inv.customer) return "";
  return typeof inv.customer === "string" ? inv.customer : inv.customer.id;
}

export function mapStripeInvoice(inv: Stripe.Invoice): ProviderInvoiceSnapshot {
  const status: "paid" | "failed" | "open" =
    inv.status === "paid" ? "paid" : inv.status === "open" || inv.status === "draft" ? "open" : "failed";

  return {
    providerPaymentId: inv.id ?? "",
    providerSubscriptionId: subscriptionIdOf(inv),
    providerCustomerId: customerIdOf(inv),
    amountCents: BigInt(inv.amount_paid || inv.amount_due || 0),
    currency: (inv.currency || "brl").toUpperCase(),
    status,
    // Charge is now a string ref in v22 webhooks; payment method / fee / failure
    // reason require a separate fetch. Left null for MVP; can be enriched later.
    paymentMethod: null,
    gatewayFeeCents: null,
    paidAt: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000) : null,
    failureReason: null,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
  };
}
