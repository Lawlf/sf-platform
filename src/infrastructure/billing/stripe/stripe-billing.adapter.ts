import type Stripe from "stripe";

import type { PaymentProvider } from "@/domain/entities/subscription.entity";
import type {
  BillingProvider,
  CheckoutSessionInput,
  CheckoutSessionOutput,
  ParsedWebhookEvent,
  ProviderInvoiceSnapshot,
  ProviderSubscriptionSnapshot,
  SetupSessionInput,
} from "@/domain/ports/external/billing-provider.port";
import { requireStripeConfig } from "@/infrastructure/config/env";

import { mapStripeEvent } from "./mappers/stripe-event.mapper";
import { mapStripeInvoice } from "./mappers/stripe-invoice.mapper";
import { mapStripeSubscription } from "./mappers/stripe-subscription.mapper";
import { getStripeClient } from "./stripe-client";

export class StripeBillingAdapter implements BillingProvider {
  readonly provider: PaymentProvider = "stripe";

  constructor(
    private readonly stripe: Stripe,
    private readonly webhookSecret: string,
    private readonly paymentMethods: string[] = ["card"],
  ) {}

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionOutput> {
    const baseParams = {
      payment_method_types: this.paymentMethods as ("card" | "pix" | "boleto")[],
      line_items: [{ price: input.priceId, quantity: 1 }],
      customer_email: input.userEmail,
      client_reference_id: input.userId,
      metadata: { userId: input.userId, ...(input.metadata ?? {}) },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      locale: "pt-BR" as const,
      allow_promotion_codes: true,
    };

    const session =
      input.mode === "subscription"
        ? await this.stripe.checkout.sessions.create({
            ...baseParams,
            mode: "subscription",
            subscription_data: { metadata: { userId: input.userId } },
          })
        : await this.stripe.checkout.sessions.create({
            ...baseParams,
            mode: "payment",
            customer_creation: "always",
            payment_intent_data: { metadata: { userId: input.userId } },
          });

    if (!session.url) throw new Error("Stripe checkout session missing url");
    return { sessionId: session.id, redirectUrl: session.url };
  }

  async createSetupSession(input: SetupSessionInput): Promise<CheckoutSessionOutput> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["card"],
      customer: input.providerCustomerId,
      metadata: { userId: input.userId },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      locale: "pt-BR",
    });
    if (!session.url) throw new Error("Stripe setup session missing url");
    return { sessionId: session.id, redirectUrl: session.url };
  }

  async createBillingPortalSession(input: {
    providerCustomerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: input.providerCustomerId,
      return_url: input.returnUrl,
      locale: "pt-BR",
    });
    if (!session.url) throw new Error("Stripe billing portal session missing url");
    return { url: session.url };
  }

  async cancelAtPeriodEnd(providerSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async reactivate(providerSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async swapSubscriptionPrice(
    providerSubscriptionId: string,
    newProviderPriceId: string,
  ): Promise<ProviderSubscriptionSnapshot> {
    const current = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
    const item = current.items.data[0];
    if (!item) throw new Error("Stripe subscription has no item");
    const updated = await this.stripe.subscriptions.update(providerSubscriptionId, {
      items: [{ id: item.id, price: newProviderPriceId }],
      proration_behavior: "create_prorations",
    });
    return mapStripeSubscription(updated);
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionSnapshot> {
    const sub = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
    return mapStripeSubscription(sub);
  }

  async getLatestInvoiceForSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderInvoiceSnapshot | null> {
    const sub = await this.stripe.subscriptions.retrieve(providerSubscriptionId, {
      expand: ["latest_invoice"],
    });
    const latest = (sub as unknown as { latest_invoice?: Stripe.Invoice | string | null })
      .latest_invoice;
    if (!latest || typeof latest === "string") {
      if (typeof latest === "string") {
        const inv = await this.stripe.invoices.retrieve(latest);
        return mapStripeInvoice(inv);
      }
      return null;
    }
    return mapStripeInvoice(latest);
  }

  verifyAndParseWebhook(rawBody: string, signature: string): ParsedWebhookEvent | null {
    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      return mapStripeEvent(event);
    } catch {
      return null;
    }
  }
}

export function buildStripeBillingAdapter(): StripeBillingAdapter {
  const cfg = requireStripeConfig();
  return new StripeBillingAdapter(getStripeClient(), cfg.webhookSecret, cfg.paymentMethods);
}
