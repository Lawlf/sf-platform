import { describe, expect, it } from "vitest";

import {
  AlreadySubscribedError,
  BillingProviderError,
  InvalidWebhookSignatureError,
  NoActiveSubscriptionError,
} from "./billing-errors";

describe("billing errors", () => {
  it("AlreadySubscribedError has code", () => {
    const e = new AlreadySubscribedError("user already pro");
    expect(e.code).toBe("ALREADY_SUBSCRIBED");
    expect(e.message).toBe("user already pro");
  });

  it("NoActiveSubscriptionError has code", () => {
    const e = new NoActiveSubscriptionError("no sub");
    expect(e.code).toBe("NO_ACTIVE_SUBSCRIPTION");
  });

  it("BillingProviderError wraps a cause", () => {
    const cause = new Error("network");
    const e = new BillingProviderError("stripe failed", { cause });
    expect(e.code).toBe("BILLING_PROVIDER_ERROR");
    expect(e.cause).toBe(cause);
  });

  it("InvalidWebhookSignatureError has code", () => {
    const e = new InvalidWebhookSignatureError("bad sig");
    expect(e.code).toBe("INVALID_WEBHOOK_SIGNATURE");
  });
});
