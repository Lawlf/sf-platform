import type Stripe from "stripe";

import { processBillingWebhook } from "@/application/use-cases/billing/process-billing-webhook.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { mapStripeEvent } from "@/infrastructure/billing/stripe/mappers/stripe-event.mapper";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { loadEnv } from "@/infrastructure/config/env";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import { DrizzlePaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-payment.repository";
import { DrizzlePlanRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-plan.repository";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { DrizzleWebhookEventRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-webhook-event.repository";
import { withTransaction } from "@/infrastructure/persistence/drizzle/with-transaction";
import { getQStashReceiver } from "@/infrastructure/queue/qstash-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface JobBody {
  rawEvent: Stripe.Event;
}

export async function POST(req: Request) {
  const receiver = getQStashReceiver();
  if (!receiver) {
    return new Response("qstash not configured", { status: 500 });
  }

  const signature = req.headers.get("upstash-signature");
  if (!signature) return new Response("missing qstash signature", { status: 400 });

  const rawBody = await req.text();
  const valid = await receiver
    .verify({ signature, body: rawBody })
    .catch(() => false);
  if (!valid) return new Response("invalid qstash signature", { status: 400 });

  let payload: JobBody;
  try {
    payload = JSON.parse(rawBody) as JobBody;
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  if (!payload.rawEvent || typeof payload.rawEvent !== "object") {
    return new Response("missing rawEvent", { status: 400 });
  }

  const parsedEvent = mapStripeEvent(payload.rawEvent);
  const env = loadEnv();
  const result = await processBillingWebhook(
    {
      webhookEvents: new DrizzleWebhookEventRepository(),
      subscriptions: new DrizzleSubscriptionRepository(),
      payments: new DrizzlePaymentRepository(),
      plans: new DrizzlePlanRepository(),
      users: new DrizzleUserRepository(),
      billing: buildStripeBillingAdapter(),
      email: new ResendEmailService(),
      clock: new SystemClock(),
      appUrl: env.NEXT_PUBLIC_APP_URL,
      transaction: withTransaction,
    },
    parsedEvent,
  );

  if (result._tag === "err") {
    console.error("[qstash-worker] processing failed", {
      eventId: parsedEvent.id,
      type: parsedEvent.type,
      error: result.error,
    });
    // Return 500 so QStash retries with exponential backoff.
    return new Response("error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
