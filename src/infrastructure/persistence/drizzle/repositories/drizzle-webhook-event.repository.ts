import { eq } from "drizzle-orm";

import type { WebhookEventRepository } from "@/domain/ports/repositories/webhook-event.repository";

import { getDb } from "../client";
import { stripeWebhookEvents } from "../schema/stripe-webhook-events.schema";

export class DrizzleWebhookEventRepository implements WebhookEventRepository {
  async recordIfNew(id: string, type: string, payload: unknown): Promise<boolean> {
    const result = await getDb()
      .insert(stripeWebhookEvents)
      .values({ id, type, payload })
      .onConflictDoNothing({ target: stripeWebhookEvents.id })
      .returning({ id: stripeWebhookEvents.id });
    return result.length > 0;
  }

  async deleteById(id: string): Promise<void> {
    await getDb().delete(stripeWebhookEvents).where(eq(stripeWebhookEvents.id, id));
  }
}
