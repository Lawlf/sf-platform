import { describe, expect, it, vi } from "vitest";

import { NoActiveSubscriptionError } from "@/domain/errors/billing-errors";
import { isErr, isOk } from "@/shared/errors/result";

import { createSetupSession } from "./create-setup-session.use-case";

describe("createSetupSession", () => {
  it("returns redirectUrl using existing customer", async () => {
    const r = await createSetupSession(
      {
        subscriptions: {
          findActiveByUserId: vi.fn(async () => ({
            id: "s1",
            userId: "u1",
            provider: "stripe",
            providerSubscriptionId: "sub_x",
            providerCustomerId: "cus_1",
          })),
        } as never,
        billing: {
          createSetupSession: vi.fn(async () => ({
            sessionId: "cs_setup",
            redirectUrl: "https://checkout.stripe.com/setup",
          })),
        } as never,
        appUrl: "https://saborfinanceiro.com.br",
      },
      { userId: "u1" },
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.redirectUrl).toContain("setup");
  });

  it("fails with NoActiveSubscriptionError without active sub", async () => {
    const r = await createSetupSession(
      {
        subscriptions: { findActiveByUserId: vi.fn(async () => null) } as never,
        billing: { createSetupSession: vi.fn() } as never,
        appUrl: "https://saborfinanceiro.com.br",
      },
      { userId: "u1" },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBeInstanceOf(NoActiveSubscriptionError);
  });
});
