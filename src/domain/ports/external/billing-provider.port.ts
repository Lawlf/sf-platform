import type {
  PaymentProvider,
  SubscriptionStatus,
} from "@/domain/entities/subscription.entity";

export interface CheckoutSessionInput {
  userId: string;
  userEmail: string;
  priceId: string;
  /** "subscription" for recurring, "payment" for one-time (lifetime). */
  mode: "subscription" | "payment";
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionOutput {
  sessionId: string;
  redirectUrl: string;
}

export interface SetupSessionInput {
  userId: string;
  providerCustomerId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface ProviderSubscriptionSnapshot {
  providerSubscriptionId: string;
  providerCustomerId: string;
  providerPriceId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
}

export interface ProviderInvoiceSnapshot {
  providerPaymentId: string;
  providerSubscriptionId: string;
  providerCustomerId: string;
  amountCents: bigint;
  currency: string;
  status: "paid" | "failed" | "open";
  paymentMethod: "card" | "pix" | null;
  gatewayFeeCents: bigint | null;
  paidAt: Date | null;
  failureReason: string | null;
  hostedInvoiceUrl: string | null;
}

export type ParsedWebhookEventData =
  | {
      kind: "checkout.completed";
      userId: string;
      providerSubscriptionId: string;
      providerCustomerId: string;
    }
  | {
      kind: "lifetime.purchased";
      userId: string;
      planSlug: string | null;
      providerPaymentIntentId: string;
      providerCustomerId: string;
      amountCents: bigint;
      currency: string;
    }
  | { kind: "invoice.paid"; invoice: ProviderInvoiceSnapshot }
  | { kind: "invoice.payment_failed"; invoice: ProviderInvoiceSnapshot }
  | { kind: "subscription.updated"; snapshot: ProviderSubscriptionSnapshot }
  | { kind: "subscription.deleted"; providerSubscriptionId: string }
  | { kind: "unhandled"; type: string };

export interface ParsedWebhookEvent {
  id: string;
  type: string;
  rawPayload: unknown;
  data: ParsedWebhookEventData;
}

export interface BillingProvider {
  readonly provider: PaymentProvider;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionOutput>;
  createSetupSession(input: SetupSessionInput): Promise<CheckoutSessionOutput>;
  cancelAtPeriodEnd(providerSubscriptionId: string): Promise<void>;
  reactivate(providerSubscriptionId: string): Promise<void>;
  /** Substitui o price do item da subscription. Habilita rateio (proration). */
  swapSubscriptionPrice(
    providerSubscriptionId: string,
    newProviderPriceId: string,
  ): Promise<ProviderSubscriptionSnapshot>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionSnapshot>;
  /** Retorna o invoice mais recente de uma subscription (ou null se nenhum). */
  getLatestInvoiceForSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderInvoiceSnapshot | null>;
  /** Verifica HMAC + parseia. Retorna null se assinatura invalida. */
  verifyAndParseWebhook(rawBody: string, signature: string): ParsedWebhookEvent | null;
}
