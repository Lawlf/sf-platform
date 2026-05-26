import type { Payment } from "@/domain/entities/payment.entity";
import type { Subscription } from "@/domain/entities/subscription.entity";
import { BillingProviderError } from "@/domain/errors/billing-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { PaymentRepository } from "@/domain/ports/repositories/payment.repository";
import type { PlanRepository } from "@/domain/ports/repositories/plan.repository";
import type { SubscriptionRepository } from "@/domain/ports/repositories/subscription.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { EmailService } from "@/domain/ports/services/email.service";
import { err, ok, type Result } from "@/shared/errors/result";

import { activatePro } from "./activate-pro.use-case";

const LIFETIME_PERIOD_END = new Date("2099-12-31T23:59:59Z");

export type ProGrant = { kind: "lifetime" } | { kind: "period"; months: 1 | 3 | 12 };

export interface GrantProManuallyInput {
  userId: string;
  grant: ProGrant;
  adminId: string;
}

export interface GrantProManuallyDeps {
  users: UserRepository;
  subscriptions: SubscriptionRepository;
  payments: PaymentRepository;
  plans: PlanRepository;
  email: EmailService;
  clock: Clock;
  appUrl: string;
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Grants cortesia Pro: upserts a manual active subscription (priceCents 0),
 * records a R$0 manual succeeded payment, then reuses activatePro to flip the
 * user + send the welcome email. No outer transaction (each save idempotent).
 */
export async function grantProManually(
  deps: GrantProManuallyDeps,
  input: GrantProManuallyInput,
): Promise<Result<void, BillingProviderError>> {
  const user = await deps.users.findById(input.userId);
  if (!user) return err(new BillingProviderError(`User not found: ${input.userId}`));

  const now = deps.clock.now();
  const periodEnd =
    input.grant.kind === "lifetime" ? LIFETIME_PERIOD_END : addMonths(now, input.grant.months);

  const existing = await deps.subscriptions.findActiveByUserId(input.userId);
  const sub: Subscription = {
    id: existing?.id ?? crypto.randomUUID(),
    userId: input.userId,
    planId: null,
    provider: "manual",
    providerSubscriptionId: null,
    providerCustomerId: null,
    status: "active",
    priceCents: 0n,
    currency: "BRL",
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await deps.subscriptions.save(sub);

  const payment: Payment = {
    id: crypto.randomUUID(),
    subscriptionId: sub.id,
    userId: input.userId,
    provider: "manual",
    providerPaymentId: null,
    amountCents: 0n,
    currency: "BRL",
    status: "succeeded",
    paymentMethod: "manual",
    gatewayFeeCents: null,
    paidAt: now,
    failedAt: null,
    failureReason: null,
    hostedInvoiceUrl: null,
    createdAt: now,
  };
  await deps.payments.save(payment);

  await activatePro(
    { users: deps.users, email: deps.email, clock: deps.clock, appUrl: deps.appUrl },
    input.userId,
  );

  return ok(undefined);
}
