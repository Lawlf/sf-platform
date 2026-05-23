import { processBillingWebhook } from "@/application/use-cases/billing/process-billing-webhook.use-case";
import { buildStripeBillingAdapter } from "@/infrastructure/billing/stripe/stripe-billing.adapter";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { loadEnv } from "@/infrastructure/config/env";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import { DrizzlePaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-payment.repository";
import { DrizzlePlanRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-plan.repository";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { DrizzleWebhookEventRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-webhook-event.repository";
import { withTransaction } from "@/infrastructure/persistence/drizzle/with-transaction";
import { getQStashClient } from "@/infrastructure/queue/qstash-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  const rawBody = await req.text();
  const billing = buildStripeBillingAdapter();
  const event = billing.verifyAndParseWebhook(rawBody, signature);
  if (!event) return new Response("invalid signature", { status: 400 });

  const qstash = getQStashClient();
  const env = loadEnv();
  const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  // Async path (production): publish to QStash, return 200 fast so Stripe doesn't retry.
  if (qstash && !baseUrl.includes("localhost")) {
    try {
      const rawEvent = JSON.parse(rawBody);
      await qstash.publishJSON({
        url: `${baseUrl}/api/jobs/stripe-event`,
        body: { rawEvent },
        retries: 3,
      });
      return new Response("queued", { status: 200 });
    } catch (e) {
      console.error("[stripe-webhook] failed to enqueue, falling back to inline:", e);
    }
  }

  // Inline path (dev or QStash unavailable).
  const result = await processBillingWebhook(
    {
      webhookEvents: new DrizzleWebhookEventRepository(),
      subscriptions: new DrizzleSubscriptionRepository(),
      payments: new DrizzlePaymentRepository(),
      plans: new DrizzlePlanRepository(),
      users: new DrizzleUserRepository(),
      billing,
      email: new ResendEmailService(),
      clock: new SystemClock(),
      appUrl: env.NEXT_PUBLIC_APP_URL,
      transaction: withTransaction,
    },
    event,
  );

  if (result._tag === "err") {
    console.error("[stripe-webhook] processing failed", {
      eventId: event.id,
      type: event.type,
      error: result.error,
    });
    return new Response("error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
