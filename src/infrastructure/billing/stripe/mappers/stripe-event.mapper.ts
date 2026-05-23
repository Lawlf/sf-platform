import type Stripe from "stripe";

import type {
  ParsedWebhookEvent,
  ParsedWebhookEventData,
} from "@/domain/ports/external/billing-provider.port";

import { mapStripeInvoice } from "./stripe-invoice.mapper";
import { mapStripeSubscription } from "./stripe-subscription.mapper";

function mapData(event: Stripe.Event): ParsedWebhookEventData {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId =
        (s.metadata?.userId as string | undefined) ?? (s.client_reference_id as string | undefined);
      if (!userId) return { kind: "unhandled", type: event.type };
      const providerCustomerId =
        typeof s.customer === "string"
          ? s.customer
          : (s.customer as Stripe.Customer | null)?.id ?? "";

      if (s.mode === "payment") {
        const providerPaymentIntentId =
          typeof s.payment_intent === "string"
            ? s.payment_intent
            : (s.payment_intent as Stripe.PaymentIntent | null)?.id ?? "";
        if (!providerPaymentIntentId) return { kind: "unhandled", type: event.type };
        return {
          kind: "lifetime.purchased",
          userId,
          planSlug: (s.metadata?.planSlug as string | undefined) ?? null,
          providerPaymentIntentId,
          providerCustomerId,
          amountCents: BigInt(s.amount_total ?? 0),
          currency: (s.currency ?? "brl").toUpperCase(),
        };
      }

      const providerSubscriptionId =
        typeof s.subscription === "string"
          ? s.subscription
          : (s.subscription as Stripe.Subscription | null)?.id ?? "";
      return {
        kind: "checkout.completed",
        userId,
        providerSubscriptionId,
        providerCustomerId,
      };
    }
    case "invoice.paid": {
      return { kind: "invoice.paid", invoice: mapStripeInvoice(event.data.object as Stripe.Invoice) };
    }
    case "invoice.payment_failed": {
      return {
        kind: "invoice.payment_failed",
        invoice: mapStripeInvoice(event.data.object as Stripe.Invoice),
      };
    }
    case "customer.subscription.updated": {
      return {
        kind: "subscription.updated",
        snapshot: mapStripeSubscription(event.data.object as Stripe.Subscription),
      };
    }
    case "customer.subscription.deleted": {
      return {
        kind: "subscription.deleted",
        providerSubscriptionId: (event.data.object as Stripe.Subscription).id,
      };
    }
    default:
      return { kind: "unhandled", type: event.type };
  }
}

export function mapStripeEvent(event: Stripe.Event): ParsedWebhookEvent {
  return {
    id: event.id,
    type: event.type,
    rawPayload: event,
    data: mapData(event),
  };
}
