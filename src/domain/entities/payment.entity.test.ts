import { describe, expect, it } from "vitest";

import { netCents, type Payment } from "./payment.entity";

function basePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay_1",
    subscriptionId: "sub_1",
    userId: "user_1",
    provider: "stripe",
    providerPaymentId: "in_1",
    amountCents: 1490n,
    currency: "BRL",
    status: "succeeded",
    paymentMethod: "card",
    gatewayFeeCents: 60n,
    paidAt: new Date("2026-05-01T00:00:00Z"),
    failedAt: null,
    failureReason: null,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

describe("netCents", () => {
  it("subtracts gateway fee from amount", () => {
    expect(netCents(basePayment())).toBe(1430n);
  });

  it("returns amount when fee is null", () => {
    expect(netCents(basePayment({ gatewayFeeCents: null }))).toBe(1490n);
  });
});
