import { describe, expect, it, vi } from "vitest";

import type { Payment } from "@/domain/entities/payment.entity";
import type { Subscription } from "@/domain/entities/subscription.entity";
import type { ParsedWebhookEvent } from "@/domain/ports/external/billing-provider.port";
import { isOk } from "@/shared/errors/result";

import { processBillingWebhook } from "./process-billing-webhook.use-case";

const NOW = new Date("2026-05-22T12:00:00Z");
const FUTURE = new Date(NOW.getTime() + 30 * 86400000);

function makeDeps() {
  const subsStore = new Map<string, Subscription>();
  const paymentsStore: Payment[] = [];
  const usersUpdated: { id: string; isPro: boolean }[] = [];
  const eventsSeen = new Set<string>();
  const emailsSent: string[] = [];
  return {
    webhookEvents: {
      recordIfNew: vi.fn(async (id: string) => {
        if (eventsSeen.has(id)) return false;
        eventsSeen.add(id);
        return true;
      }),
      deleteById: vi.fn(async (id: string) => {
        eventsSeen.delete(id);
      }),
    },
    subscriptions: {
      findById: vi.fn(async (id: string) => subsStore.get(id) ?? null),
      findByProviderSubscriptionId: vi.fn(async (_p: string, sid: string) => {
        return [...subsStore.values()].find((s) => s.providerSubscriptionId === sid) ?? null;
      }),
      findActiveByUserId: vi.fn(async () => null),
      findAllByUserId: vi.fn(async () => []),
      save: vi.fn(async (s: Subscription) => {
        subsStore.set(s.id, s);
      }),
    },
    payments: {
      findByProviderPaymentId: vi.fn(async () => null),
      save: vi.fn(async (p: Payment) => {
        paymentsStore.push(p);
      }),
    },
    users: {
      findById: vi.fn(async (id: string) => ({
        id,
        email: `${id}@x.com`,
        emailVerifiedAt: NOW,
        displayName: "T",
        role: "user" as const,
        plan: "free" as const,
        isPro: false,
        deactivatedAt: null,
        deactivationReason: null,
        contentDiagnosticAnswer: null,
        contentDiagnosticAnsweredAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      })),
      update: vi.fn(async (u) => {
        usersUpdated.push({ id: u.id, isPro: u.isPro });
      }),
    },
    plans: {
      findBySlug: vi.fn(async () => null),
      findByProviderPriceId: vi.fn(async () => ({
        id: "plan_1",
        slug: "pro-monthly",
        name: "PRO Mensal",
        provider: "stripe" as const,
        providerProductId: "prod_x",
        providerPriceId: "price_x",
        priceCents: 1990n,
        currency: "BRL",
        billingInterval: "month" as const,
        features: [],
        active: true,
        sortOrder: 0,
        createdAt: NOW,
        updatedAt: NOW,
      })),
      findActive: vi.fn(async () => []),
    },
    billing: {
      provider: "stripe" as const,
      getSubscription: vi.fn(async (sid: string) => ({
        providerSubscriptionId: sid,
        providerCustomerId: "cus_1",
        providerPriceId: "price_x",
        status: "active" as const,
        currentPeriodStart: NOW,
        currentPeriodEnd: FUTURE,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        endedAt: null,
      })),
      getLatestInvoiceForSubscription: vi.fn(async () => null),
    },
    email: {
      send: vi.fn(async (m: { subject: string }) => {
        emailsSent.push(m.subject);
      }),
    },
    clock: { now: () => NOW },
    appUrl: "https://saborfinanceiro.com.br",
    transaction: <T>(fn: () => Promise<T>) => fn(),
    _subs: subsStore,
    _payments: paymentsStore,
    _users: usersUpdated,
    _emails: emailsSent,
  };
}

describe("processBillingWebhook", () => {
  it("checkout.completed creates active sub + activates Pro", async () => {
    const deps = makeDeps();
    const event: ParsedWebhookEvent = {
      id: "evt_1",
      type: "checkout.session.completed",
      rawPayload: {},
      data: {
        kind: "checkout.completed",
        userId: "user_1",
        providerSubscriptionId: "sub_stripe_1",
        providerCustomerId: "cus_1",
      },
    };
    const r = await processBillingWebhook(deps as never, event);
    expect(isOk(r)).toBe(true);
    expect(deps._subs.size).toBe(1);
    expect(deps._users.some((u) => u.isPro)).toBe(true);
    expect(deps._emails.some((s) => /Pro/.test(s))).toBe(true);
  });

  it("idempotent: same event id processed twice has no double effect", async () => {
    const deps = makeDeps();
    const event: ParsedWebhookEvent = {
      id: "evt_dup",
      type: "checkout.session.completed",
      rawPayload: {},
      data: {
        kind: "checkout.completed",
        userId: "user_1",
        providerSubscriptionId: "sub_stripe_1",
        providerCustomerId: "cus_1",
      },
    };
    await processBillingWebhook(deps as never, event);
    await processBillingWebhook(deps as never, event);
    expect(deps._users.filter((u) => u.isPro)).toHaveLength(1);
    expect(deps._emails).toHaveLength(1);
  });

  it("invoice.payment_failed marks past_due + sends payment-failed email", async () => {
    const deps = makeDeps();
    deps._subs.set("sub_local_1", {
      id: "sub_local_1",
      userId: "user_1",
      planId: null,
      provider: "stripe",
      providerSubscriptionId: "sub_stripe_1",
      providerCustomerId: "cus_1",
      status: "active",
      priceCents: 1490n,
      currency: "BRL",
      currentPeriodStart: NOW,
      currentPeriodEnd: FUTURE,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const event: ParsedWebhookEvent = {
      id: "evt_failed",
      type: "invoice.payment_failed",
      rawPayload: {},
      data: {
        kind: "invoice.payment_failed",
        invoice: {
          providerPaymentId: "in_1",
          providerSubscriptionId: "sub_stripe_1",
          providerCustomerId: "cus_1",
          amountCents: 1490n,
          currency: "BRL",
          status: "failed",
          paymentMethod: "card",
          gatewayFeeCents: null,
          paidAt: null,
          failureReason: "card_declined",
          hostedInvoiceUrl: null,
        },
      },
    };
    await processBillingWebhook(deps as never, event);
    expect(deps._payments[0]?.status).toBe("failed");
    const updatedSub = [...deps._subs.values()][0];
    expect(updatedSub?.status).toBe("past_due");
    expect(deps._emails.some((s) => /cart[ãa]o/i.test(s) || /trope[çc]o/i.test(s))).toBe(true);
  });

  it("charge.refunded (full) marks payment refunded, cancels sub, downgrades user", async () => {
    const deps = makeDeps();
    deps._subs.set("sub_local_1", {
      id: "sub_local_1",
      userId: "user_1",
      planId: null,
      provider: "stripe",
      providerSubscriptionId: "sub_stripe_1",
      providerCustomerId: "cus_1",
      status: "active",
      priceCents: 1990n,
      currency: "BRL",
      currentPeriodStart: NOW,
      currentPeriodEnd: FUTURE,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    (deps.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user_1",
      email: "t@x.com",
      emailVerifiedAt: NOW,
      displayName: "T",
      role: "user",
      plan: "pro",
      isPro: true,
      deactivatedAt: null,
      deactivationReason: null,
      contentDiagnosticAnswer: null,
      contentDiagnosticAnsweredAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    (deps.payments.findByProviderPaymentId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pay_1",
      subscriptionId: "sub_local_1",
      userId: "user_1",
      provider: "stripe",
      providerPaymentId: "in_1",
      amountCents: 1990n,
      currency: "BRL",
      status: "succeeded",
      paymentMethod: "card",
      gatewayFeeCents: null,
      paidAt: NOW,
      failedAt: null,
      failureReason: null,
      hostedInvoiceUrl: null,
      createdAt: NOW,
    } satisfies Payment);
    const event: ParsedWebhookEvent = {
      id: "evt_refund_full",
      type: "charge.refunded",
      rawPayload: {},
      data: { kind: "charge.refunded", providerPaymentIds: ["in_1"], fullyRefunded: true },
    };
    await processBillingWebhook(deps as never, event);
    expect(deps._payments.some((p) => p.status === "refunded")).toBe(true);
    expect([...deps._subs.values()][0]?.status).toBe("canceled");
    expect(deps._users.some((u) => !u.isPro)).toBe(true);
  });

  it("charge.refunded (partial) marks payment refunded but keeps access", async () => {
    const deps = makeDeps();
    deps._subs.set("sub_local_1", {
      id: "sub_local_1",
      userId: "user_1",
      planId: null,
      provider: "stripe",
      providerSubscriptionId: "sub_stripe_1",
      providerCustomerId: "cus_1",
      status: "active",
      priceCents: 1990n,
      currency: "BRL",
      currentPeriodStart: NOW,
      currentPeriodEnd: FUTURE,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    (deps.payments.findByProviderPaymentId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pay_1",
      subscriptionId: "sub_local_1",
      userId: "user_1",
      provider: "stripe",
      providerPaymentId: "in_1",
      amountCents: 1990n,
      currency: "BRL",
      status: "succeeded",
      paymentMethod: "card",
      gatewayFeeCents: null,
      paidAt: NOW,
      failedAt: null,
      failureReason: null,
      hostedInvoiceUrl: null,
      createdAt: NOW,
    } satisfies Payment);
    const event: ParsedWebhookEvent = {
      id: "evt_refund_partial",
      type: "charge.refunded",
      rawPayload: {},
      data: { kind: "charge.refunded", providerPaymentIds: ["in_1"], fullyRefunded: false },
    };
    await processBillingWebhook(deps as never, event);
    expect(deps._payments.some((p) => p.status === "refunded")).toBe(true);
    expect([...deps._subs.values()][0]?.status).toBe("active");
    expect(deps._users.some((u) => !u.isPro)).toBe(false);
  });

  it("subscription.deleted downgrades user to Free", async () => {
    const deps = makeDeps();
    deps._subs.set("sub_local_1", {
      id: "sub_local_1",
      userId: "user_1",
      planId: null,
      provider: "stripe",
      providerSubscriptionId: "sub_stripe_1",
      providerCustomerId: "cus_1",
      status: "active",
      priceCents: 1490n,
      currency: "BRL",
      currentPeriodStart: NOW,
      currentPeriodEnd: FUTURE,
      cancelAtPeriodEnd: true,
      canceledAt: NOW,
      endedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    (deps.users.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user_1",
      email: "t@x.com",
      emailVerifiedAt: NOW,
      displayName: "T",
      role: "user",
      plan: "pro",
      isPro: true,
      deactivatedAt: null,
      deactivationReason: null,
      contentDiagnosticAnswer: null,
      contentDiagnosticAnsweredAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const event: ParsedWebhookEvent = {
      id: "evt_del",
      type: "customer.subscription.deleted",
      rawPayload: {},
      data: { kind: "subscription.deleted", providerSubscriptionId: "sub_stripe_1" },
    };
    await processBillingWebhook(deps as never, event);
    expect(deps._users.some((u) => !u.isPro)).toBe(true);
    const updated = [...deps._subs.values()][0];
    expect(updated?.status).toBe("canceled");
  });
});
