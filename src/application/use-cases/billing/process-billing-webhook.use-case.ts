import type { Payment } from "@/domain/entities/payment.entity";
import type { Subscription } from "@/domain/entities/subscription.entity";
import { BillingProviderError } from "@/domain/errors/billing-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type {
  BillingProvider,
  ParsedWebhookEvent,
  ProviderInvoiceSnapshot,
  ProviderSubscriptionSnapshot,
} from "@/domain/ports/external/billing-provider.port";
import type { PaymentRepositoryPort } from "@/domain/ports/repositories/payment.repository";
import type { PlanRepositoryPort } from "@/domain/ports/repositories/plan.repository";
import type { SubscriptionRepositoryPort } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { WebhookEventRepositoryPort } from "@/domain/ports/repositories/webhook-event.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { renderEmailToHtml } from "@/infrastructure/email/email-renderer";
import {
  PAYMENT_FAILED_SUBJECT,
  PaymentFailedEmail,
} from "@/infrastructure/email/templates/payment-failed.email";
import {
  SUBSCRIPTION_CANCELED_SUBJECT,
  SubscriptionCanceledEmail,
} from "@/infrastructure/email/templates/subscription-canceled.email";
import { err, ok, type Result } from "@/shared/errors/result";

import { activatePro } from "./activate-pro.use-case";
import { downgradeToFree } from "./downgrade-to-free.use-case";

export interface ProcessBillingWebhookDeps {
  webhookEvents: WebhookEventRepositoryPort;
  subscriptions: SubscriptionRepositoryPort;
  payments: PaymentRepositoryPort;
  plans: PlanRepositoryPort;
  users: UserRepositoryPort;
  billing: BillingProvider;
  email: EmailService;
  clock: Clock;
  appUrl: string;
  transaction: <T>(fn: () => Promise<T>) => Promise<T>;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function processBillingWebhook(
  deps: ProcessBillingWebhookDeps,
  event: ParsedWebhookEvent,
): Promise<Result<void, BillingProviderError>> {
  /**
   * No outer DB transaction: each repo save is idempotent (subscriptions/payments
   * have unique constraints; user.update is a simple field write). Wrapping the
   * full handler in a tx forced HTTP calls (Stripe getSubscription, Resend) to
   * hold a Postgres connection for their full duration, exhausting the pool on
   * webhook bursts.
   */
  const isNew = await deps.webhookEvents.recordIfNew(event.id, event.type, event.rawPayload);
  if (!isNew) return ok(undefined);

  try {
    switch (event.data.kind) {
      case "checkout.completed":
        await handleCheckoutCompleted(deps, event.data);
        break;
      case "lifetime.purchased":
        await handleLifetimePurchased(deps, event.data);
        break;
      case "invoice.paid":
        await handleInvoicePaid(deps, event.data.invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(deps, event.data.invoice);
        break;
      case "charge.refunded":
        await handleChargeRefunded(deps, event.data);
        break;
      case "subscription.updated":
        await handleSubscriptionUpdated(deps, event.data.snapshot);
        break;
      case "subscription.deleted":
        await handleSubscriptionDeleted(deps, event.data.providerSubscriptionId);
        break;
      case "unhandled":
        break;
    }
    return ok(undefined);
  } catch (e) {
    console.error("[webhook] handler failure:", { eventId: event.id, type: event.type, error: e });
    // Rollback the idempotency marker so QStash/Stripe retries reprocess this event.
    try {
      await deps.webhookEvents.deleteById(event.id);
    } catch (delErr) {
      console.error("[webhook] failed to rollback event marker:", delErr);
    }
    return err(new BillingProviderError("Falha ao processar evento Stripe.", { cause: e }));
  }
}

async function handleCheckoutCompleted(
  deps: ProcessBillingWebhookDeps,
  data: { userId: string; providerSubscriptionId: string; providerCustomerId: string },
): Promise<void> {
  const snapshot = await deps.billing.getSubscription(data.providerSubscriptionId);
  const plan = snapshot.providerPriceId
    ? await deps.plans.findByProviderPriceId(deps.billing.provider, snapshot.providerPriceId)
    : null;
  const existing = await deps.subscriptions.findByProviderSubscriptionId(
    deps.billing.provider,
    data.providerSubscriptionId,
  );
  const sub: Subscription = existing ?? {
    id: crypto.randomUUID(),
    userId: data.userId,
    planId: plan?.id ?? null,
    provider: deps.billing.provider,
    providerSubscriptionId: data.providerSubscriptionId,
    providerCustomerId: data.providerCustomerId,
    status: snapshot.status,
    priceCents: plan?.priceCents ?? 1990n,
    currency: plan?.currency ?? "BRL",
    currentPeriodStart: snapshot.currentPeriodStart,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    canceledAt: snapshot.canceledAt,
    endedAt: snapshot.endedAt,
    createdAt: deps.clock.now(),
    updatedAt: deps.clock.now(),
  };
  if (existing && plan) {
    existing.planId = plan.id;
    existing.priceCents = plan.priceCents;
  }
  Object.assign(sub, {
    status: snapshot.status,
    currentPeriodStart: snapshot.currentPeriodStart,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
    canceledAt: snapshot.canceledAt,
    endedAt: snapshot.endedAt,
    updatedAt: deps.clock.now(),
  });
  await deps.subscriptions.save(sub);

  try {
    const latestInvoice = await deps.billing.getLatestInvoiceForSubscription(
      data.providerSubscriptionId,
    );
    if (latestInvoice && latestInvoice.providerPaymentId) {
      const existing = await deps.payments.findByProviderPaymentId(
        deps.billing.provider,
        latestInvoice.providerPaymentId,
      );
      if (!existing) {
        const payment: Payment = {
          id: crypto.randomUUID(),
          subscriptionId: sub.id,
          userId: data.userId,
          provider: deps.billing.provider,
          providerPaymentId: latestInvoice.providerPaymentId,
          amountCents: latestInvoice.amountCents,
          currency: latestInvoice.currency,
          status: latestInvoice.status === "paid" ? "succeeded" : "pending",
          paymentMethod: latestInvoice.paymentMethod,
          gatewayFeeCents: latestInvoice.gatewayFeeCents,
          paidAt: latestInvoice.paidAt,
          failedAt: null,
          failureReason: null,
          hostedInvoiceUrl: latestInvoice.hostedInvoiceUrl,
          createdAt: deps.clock.now(),
        };
        await deps.payments.save(payment);
      }
    }
  } catch (e) {
    console.error("[webhook] initial payment fetch failed (non-blocking):", e);
  }

  // Só libera Pro quando o pagamento está confirmado (status active). Para
  // cartão/wallet/link o checkout já volta active; um eventual `incomplete`
  // (3DS/SCA pendente) é liberado depois pelo handleSubscriptionUpdated quando
  // virar active, evitando conceder Pro antes de o dinheiro entrar.
  if (snapshot.status === "active") {
    await activatePro(
      { users: deps.users, email: deps.email, clock: deps.clock, appUrl: deps.appUrl },
      data.userId,
    );
  }
}

const LIFETIME_PERIOD_END = new Date("2099-12-31T23:59:59Z");

async function handleLifetimePurchased(
  deps: ProcessBillingWebhookDeps,
  data: {
    userId: string;
    planSlug: string | null;
    providerPaymentIntentId: string;
    providerCustomerId: string;
    amountCents: bigint;
    currency: string;
  },
): Promise<void> {
  const plan = data.planSlug ? await deps.plans.findBySlug(data.planSlug) : null;
  const existingPayment = await deps.payments.findByProviderPaymentId(
    deps.billing.provider,
    data.providerPaymentIntentId,
  );
  if (existingPayment) return;

  const subId = crypto.randomUUID();
  const sub: Subscription = {
    id: subId,
    userId: data.userId,
    planId: plan?.id ?? null,
    provider: deps.billing.provider,
    providerSubscriptionId: data.providerPaymentIntentId,
    providerCustomerId: data.providerCustomerId,
    status: "active",
    priceCents: plan?.priceCents ?? data.amountCents,
    currency: data.currency,
    currentPeriodStart: deps.clock.now(),
    currentPeriodEnd: LIFETIME_PERIOD_END,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    createdAt: deps.clock.now(),
    updatedAt: deps.clock.now(),
  };
  await deps.subscriptions.save(sub);

  const payment: Payment = {
    id: crypto.randomUUID(),
    subscriptionId: subId,
    userId: data.userId,
    provider: deps.billing.provider,
    providerPaymentId: data.providerPaymentIntentId,
    amountCents: data.amountCents,
    currency: data.currency,
    status: "succeeded",
    paymentMethod: null,
    gatewayFeeCents: null,
    paidAt: deps.clock.now(),
    failedAt: null,
    failureReason: null,
    hostedInvoiceUrl: null,
    createdAt: deps.clock.now(),
  };
  await deps.payments.save(payment);

  await activatePro(
    { users: deps.users, email: deps.email, clock: deps.clock, appUrl: deps.appUrl },
    data.userId,
  );
}

async function handleInvoicePaid(
  deps: ProcessBillingWebhookDeps,
  invoice: ProviderInvoiceSnapshot,
): Promise<void> {
  const existingPayment = await deps.payments.findByProviderPaymentId(
    deps.billing.provider,
    invoice.providerPaymentId,
  );
  if (existingPayment) return;
  const sub = await deps.subscriptions.findByProviderSubscriptionId(
    deps.billing.provider,
    invoice.providerSubscriptionId,
  );
  if (!sub || !sub.userId) {
    // checkout.session.completed not processed yet; throw so QStash/Stripe retries.
    throw new Error(
      `invoice.paid arrived before subscription was persisted: ${invoice.providerSubscriptionId}`,
    );
  }
  const payment: Payment = {
    id: crypto.randomUUID(),
    subscriptionId: sub.id,
    userId: sub.userId,
    provider: deps.billing.provider,
    providerPaymentId: invoice.providerPaymentId,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    status: "succeeded",
    paymentMethod: invoice.paymentMethod,
    gatewayFeeCents: invoice.gatewayFeeCents,
    paidAt: invoice.paidAt,
    failedAt: null,
    failureReason: null,
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
    createdAt: deps.clock.now(),
  };
  await deps.payments.save(payment);

  if (sub.providerSubscriptionId) {
    const snapshot = await deps.billing.getSubscription(sub.providerSubscriptionId);
    sub.status = snapshot.status;
    sub.currentPeriodStart = snapshot.currentPeriodStart;
    sub.currentPeriodEnd = snapshot.currentPeriodEnd;
    sub.updatedAt = deps.clock.now();
    await deps.subscriptions.save(sub);
  }
  await activatePro(
    { users: deps.users, email: deps.email, clock: deps.clock, appUrl: deps.appUrl },
    sub.userId,
  );
}

async function handleInvoicePaymentFailed(
  deps: ProcessBillingWebhookDeps,
  invoice: ProviderInvoiceSnapshot,
): Promise<void> {
  const sub = await deps.subscriptions.findByProviderSubscriptionId(
    deps.billing.provider,
    invoice.providerSubscriptionId,
  );
  const payment: Payment = {
    id: crypto.randomUUID(),
    subscriptionId: sub?.id ?? null,
    userId: sub?.userId ?? "",
    provider: deps.billing.provider,
    providerPaymentId: invoice.providerPaymentId,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    status: "failed",
    paymentMethod: invoice.paymentMethod,
    gatewayFeeCents: null,
    paidAt: null,
    failedAt: deps.clock.now(),
    failureReason: invoice.failureReason,
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
    createdAt: deps.clock.now(),
  };
  await deps.payments.save(payment);

  if (sub) {
    sub.status = "past_due";
    sub.updatedAt = deps.clock.now();
    await deps.subscriptions.save(sub);
    const user = await deps.users.findById(sub.userId);
    if (user) {
      try {
        const accessEnd = new Date(sub.currentPeriodEnd.getTime() + 3 * 86400000);
        const html = await renderEmailToHtml(
          PaymentFailedEmail({
            appUrl: deps.appUrl,
            displayName: user.displayName,
            accessUntil: formatDate(accessEnd),
          }),
        );
        await deps.email.send({
          to: user.email,
          subject: PAYMENT_FAILED_SUBJECT,
          html,
          purpose: "transactional",
        });
      } catch (e) {
        console.error("[webhook] payment-failed email failed (non-blocking):", e);
      }
    }
  }
}

async function handleChargeRefunded(
  deps: ProcessBillingWebhookDeps,
  data: { providerPaymentIds: string[]; fullyRefunded: boolean },
): Promise<void> {
  let payment: Payment | null = null;
  for (const id of data.providerPaymentIds) {
    payment = await deps.payments.findByProviderPaymentId(deps.billing.provider, id);
    if (payment) break;
  }
  if (!payment) {
    console.warn("[webhook] charge.refunded: no matching payment for", data.providerPaymentIds);
    return;
  }

  if (payment.status !== "refunded") {
    await deps.payments.save({ ...payment, status: "refunded" });
  }

  // Partial refund keeps access; only a full refund revokes Pro.
  if (!data.fullyRefunded) return;

  // Cancel the subscription first so downgradeToFree (which bails while an active
  // sub exists) actually flips the user back to Free. Mirrors subscription.deleted.
  if (payment.subscriptionId) {
    const sub = await deps.subscriptions.findById(payment.subscriptionId);
    if (sub && sub.status !== "canceled") {
      sub.status = "canceled";
      sub.canceledAt = sub.canceledAt ?? deps.clock.now();
      sub.endedAt = deps.clock.now();
      sub.updatedAt = deps.clock.now();
      await deps.subscriptions.save(sub);
    }
  }

  if (payment.userId) {
    await downgradeToFree(
      {
        users: deps.users,
        subscriptions: deps.subscriptions,
        email: deps.email,
        clock: deps.clock,
        appUrl: deps.appUrl,
      },
      payment.userId,
    );
  }
}

async function handleSubscriptionUpdated(
  deps: ProcessBillingWebhookDeps,
  snapshot: ProviderSubscriptionSnapshot,
): Promise<void> {
  const sub = await deps.subscriptions.findByProviderSubscriptionId(
    deps.billing.provider,
    snapshot.providerSubscriptionId,
  );
  if (!sub) return;
  const wasScheduledForCancel = sub.cancelAtPeriodEnd;
  sub.status = snapshot.status;
  sub.currentPeriodStart = snapshot.currentPeriodStart;
  sub.currentPeriodEnd = snapshot.currentPeriodEnd;
  sub.cancelAtPeriodEnd = snapshot.cancelAtPeriodEnd;
  sub.canceledAt = snapshot.canceledAt;
  sub.endedAt = snapshot.endedAt;
  sub.updatedAt = deps.clock.now();
  await deps.subscriptions.save(sub);

  // Confirma o acesso quando a assinatura passa a ativa (ex.: 3DS/SCA concluído
  // depois do checkout, ou reativação). `activatePro` é idempotente: só grava e
  // manda boas-vindas na transição free->pro, então chamar a cada update é seguro.
  if (snapshot.status === "active") {
    await activatePro(
      { users: deps.users, email: deps.email, clock: deps.clock, appUrl: deps.appUrl },
      sub.userId,
    );
  }

  if (!wasScheduledForCancel && snapshot.cancelAtPeriodEnd) {
    const user = await deps.users.findById(sub.userId);
    if (user) {
      try {
        const html = await renderEmailToHtml(
          SubscriptionCanceledEmail({
            appUrl: deps.appUrl,
            displayName: user.displayName,
            accessUntil: formatDate(sub.currentPeriodEnd),
          }),
        );
        await deps.email.send({
          to: user.email,
          subject: SUBSCRIPTION_CANCELED_SUBJECT,
          html,
          purpose: "transactional",
        });
      } catch (e) {
        console.error("[webhook] subscription-canceled email failed (non-blocking):", e);
      }
    }
  }
}

async function handleSubscriptionDeleted(
  deps: ProcessBillingWebhookDeps,
  providerSubscriptionId: string,
): Promise<void> {
  const sub = await deps.subscriptions.findByProviderSubscriptionId(
    deps.billing.provider,
    providerSubscriptionId,
  );
  if (!sub) return;
  sub.status = "canceled";
  sub.endedAt = deps.clock.now();
  sub.updatedAt = deps.clock.now();
  await deps.subscriptions.save(sub);
  await downgradeToFree(
    {
      users: deps.users,
      subscriptions: deps.subscriptions,
      email: deps.email,
      clock: deps.clock,
      appUrl: deps.appUrl,
    },
    sub.userId,
  );
}
