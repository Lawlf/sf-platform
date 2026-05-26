import { afterEach, describe, expect, it } from "vitest";

import { getDb } from "../client";
import { stripeWebhookEvents } from "../schema/stripe-webhook-events.schema";

import { DrizzleWebhookEventRepository } from "./drizzle-webhook-event.repository";

describe("DrizzleWebhookEventRepository (IT)", () => {
  const repo = new DrizzleWebhookEventRepository();

  afterEach(async () => {
    await getDb().delete(stripeWebhookEvents);
  });

  it("recordIfNew returns true on first insert", async () => {
    const r = await repo.recordIfNew("evt_1", "checkout.session.completed", { foo: 1 });
    expect(r).toBe(true);
  });

  it("recordIfNew returns false on duplicate", async () => {
    await repo.recordIfNew("evt_2", "invoice.paid", { foo: 1 });
    const r = await repo.recordIfNew("evt_2", "invoice.paid", { foo: 2 });
    expect(r).toBe(false);
  });
});
