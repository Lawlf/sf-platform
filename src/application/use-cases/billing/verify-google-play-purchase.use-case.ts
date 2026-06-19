import type { Payment } from "@/domain/entities/payment.entity";
import type { PaymentProvider, Subscription } from "@/domain/entities/subscription.entity";
import { BillingProviderError } from "@/domain/errors/billing-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { ProviderSubscriptionSnapshot } from "@/domain/ports/external/billing-provider.port";
import type { PaymentRepositoryPort } from "@/domain/ports/repositories/payment.repository";
import type { PlanRepositoryPort } from "@/domain/ports/repositories/plan.repository";
import type { SubscriptionRepositoryPort } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { err, ok, type Result } from "@/shared/errors/result";

import { activatePro } from "./activate-pro.use-case";

export interface GooglePlaySubscriptionDetail {
  snapshot: ProviderSubscriptionSnapshot;
  latestOrderId: string | null;
  acknowledged: boolean;
}

export interface GooglePlayVerifyGateway {
  readonly provider: PaymentProvider;
  getSubscriptionDetail(purchaseToken: string): Promise<GooglePlaySubscriptionDetail>;
  acknowledge(sku: string, purchaseToken: string): Promise<void>;
}

export interface VerifyGooglePlayPurchaseDeps {
  subscriptions: SubscriptionRepositoryPort;
  payments: PaymentRepositoryPort;
  plans: PlanRepositoryPort;
  users: UserRepositoryPort;
  email: EmailService;
  clock: Clock;
  appUrl: string;
  play: GooglePlayVerifyGateway;
}

export interface VerifyGooglePlayPurchaseInput {
  userId: string;
  sku: string;
  purchaseToken: string;
}

const GRANTING_STATUSES = new Set(["active", "past_due"]);

export async function verifyGooglePlayPurchase(
  deps: VerifyGooglePlayPurchaseDeps,
  input: VerifyGooglePlayPurchaseInput,
): Promise<Result<{ activated: boolean }, BillingProviderError>> {
  let detail: GooglePlaySubscriptionDetail;
  try {
    detail = await deps.play.getSubscriptionDetail(input.purchaseToken);
  } catch (e) {
    return err(new BillingProviderError("Não foi possível validar a compra no Google Play.", { cause: e }));
  }

  const { snapshot, latestOrderId, acknowledged } = detail;
  if (!GRANTING_STATUSES.has(snapshot.status)) {
    return err(new BillingProviderError("A compra do Google Play ainda não está ativa."));
  }

  const productId = snapshot.providerPriceId ?? input.sku;
  const plan = await deps.plans.findByProviderPriceId(deps.play.provider, productId);

  const existing = await deps.subscriptions.findByProviderSubscriptionId(
    deps.play.provider,
    input.purchaseToken,
  );
  const now = deps.clock.now();
  const sub: Subscription = existing ?? {
    id: crypto.randomUUID(),
    userId: input.userId,
    planId: plan?.id ?? null,
    provider: deps.play.provider,
    providerSubscriptionId: input.purchaseToken,
    providerCustomerId: snapshot.providerCustomerId,
    status: snapshot.status,
    priceCents: plan?.priceCents ?? 1990n,
    currency: plan?.currency ?? "BRL",
    currentPeriodStart: snapshot.currentPeriodStart,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    canceledAt: snapshot.canceledAt,
    endedAt: snapshot.endedAt,
    createdAt: now,
    updatedAt: now,
  };
  Object.assign(sub, {
    userId: input.userId,
    planId: plan?.id ?? sub.planId,
    priceCents: plan?.priceCents ?? sub.priceCents,
    status: snapshot.status,
    currentPeriodStart: snapshot.currentPeriodStart,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    canceledAt: snapshot.canceledAt,
    endedAt: snapshot.endedAt,
    updatedAt: now,
  });
  await deps.subscriptions.save(sub);

  // providerPaymentId = orderId quando disponível; senão o purchaseToken (estável).
  // v1 registra só o pagamento inicial; renovações são refletidas pelo cron de
  // reconciliação (que não cria payment rows).
  const providerPaymentId = latestOrderId ?? input.purchaseToken;
  const existingPayment = await deps.payments.findByProviderPaymentId(
    deps.play.provider,
    providerPaymentId,
  );
  if (!existingPayment) {
    const payment: Payment = {
      id: crypto.randomUUID(),
      subscriptionId: sub.id,
      userId: input.userId,
      provider: deps.play.provider,
      providerPaymentId,
      amountCents: sub.priceCents,
      currency: sub.currency,
      status: "succeeded",
      paymentMethod: null,
      gatewayFeeCents: null,
      paidAt: now,
      failedAt: null,
      failureReason: null,
      hostedInvoiceUrl: null,
      createdAt: now,
    };
    await deps.payments.save(payment);
  }

  if (!acknowledged) {
    try {
      await deps.play.acknowledge(input.sku, input.purchaseToken);
    } catch (e) {
      console.error("[google-play] acknowledge failed (non-blocking):", e);
    }
  }

  await activatePro(
    { users: deps.users, email: deps.email, clock: deps.clock, appUrl: deps.appUrl },
    input.userId,
  );

  return ok({ activated: true });
}
