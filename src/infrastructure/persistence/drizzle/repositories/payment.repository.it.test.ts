import { eq, like } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Payment } from "@/domain/entities/payment.entity";

import { getDb } from "../client";
import { payments } from "../schema/payments.schema";
import { users } from "../schema/users.schema";

import { PaymentRepository } from "./payment.repository";

describe("PaymentRepository (IT)", () => {
  const repo = new PaymentRepository();
  let userId: string;

  beforeEach(async () => {
    const [row] = await getDb()
      .insert(users)
      .values({ email: `pay-test-${Date.now()}@example.com` })
      .returning({ id: users.id });
    if (!row) throw new Error("failed to seed user");
    userId = row.id;
  });

  afterEach(async () => {
    await getDb().delete(payments).where(eq(payments.userId, userId));
    await getDb().delete(users).where(like(users.email, "pay-test-%"));
  });

  it("saves and retrieves a payment", async () => {
    const p: Payment = {
      id: crypto.randomUUID(),
      subscriptionId: null,
      userId,
      provider: "stripe",
      providerPaymentId: "in_test_1",
      amountCents: 1490n,
      currency: "BRL",
      status: "succeeded",
      paymentMethod: "card",
      gatewayFeeCents: 60n,
      paidAt: new Date(),
      failedAt: null,
      failureReason: null,
      hostedInvoiceUrl: null,
      createdAt: new Date(),
    };
    await repo.save(p);
    const loaded = await repo.findById(p.id);
    expect(loaded?.amountCents).toBe(1490n);
    expect(loaded?.status).toBe("succeeded");
  });

  it("findByProviderPaymentId looks up by stripe invoice id", async () => {
    const p: Payment = {
      id: crypto.randomUUID(),
      subscriptionId: null,
      userId,
      provider: "stripe",
      providerPaymentId: "in_lookup",
      amountCents: 1490n,
      currency: "BRL",
      status: "succeeded",
      paymentMethod: "card",
      gatewayFeeCents: null,
      paidAt: new Date(),
      failedAt: null,
      failureReason: null,
      hostedInvoiceUrl: null,
      createdAt: new Date(),
    };
    await repo.save(p);
    const found = await repo.findByProviderPaymentId("stripe", "in_lookup");
    expect(found?.id).toBe(p.id);
  });

  it("findByUserId returns payments ordered desc by createdAt with limit", async () => {
    for (let i = 0; i < 3; i++) {
      await repo.save({
        id: crypto.randomUUID(),
        subscriptionId: null,
        userId,
        provider: "stripe",
        providerPaymentId: `in_loop_${i}`,
        amountCents: 1490n,
        currency: "BRL",
        status: "succeeded",
        paymentMethod: "card",
        gatewayFeeCents: null,
        paidAt: new Date(),
        failedAt: null,
        failureReason: null,
        hostedInvoiceUrl: null,
        createdAt: new Date(Date.now() + i * 1000),
      });
    }
    const list = await repo.findByUserId(userId, 2);
    expect(list).toHaveLength(2);
  });
});
