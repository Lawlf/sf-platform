import type Stripe from "stripe";


import { processBillingWebhook } from "@/application/use-cases/billing/process-billing-webhook.use-case";
import { mapStripeEvent } from "@/infrastructure/billing/stripe/mappers/stripe-event.mapper";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
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
      webhookEvents: repos.webhookEvents,
      subscriptions: repos.subscriptions,
      payments: repos.payments,
      plans: repos.plans,
      users: repos.users,
      billing: buildStripeBillingAdapter(),
      email: new ResendEmailService(),
      clock,
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
