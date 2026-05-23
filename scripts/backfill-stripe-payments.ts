/**
 * Backfill missing Payment rows from Stripe invoices.
 *
 * Para cada subscription stripe local sem Payment vinculado, busca todas as
 * invoices na Stripe e grava as que faltam. Idempotente: rodar de novo é seguro.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-stripe-payments.ts
 *   pnpm tsx scripts/backfill-stripe-payments.ts <email>   # só esse usuário
 */
import { eq } from "drizzle-orm";

import { mapStripeInvoice } from "../src/infrastructure/billing/stripe/mappers/stripe-invoice.mapper";
import { buildStripeBillingAdapter } from "../src/infrastructure/billing/stripe/stripe-billing.adapter";
import { getStripeClient } from "../src/infrastructure/billing/stripe/stripe-client";
import { getDb } from "../src/infrastructure/persistence/drizzle/client";
import { DrizzlePaymentRepository } from "../src/infrastructure/persistence/drizzle/repositories/drizzle-payment.repository";
import { subscriptions } from "../src/infrastructure/persistence/drizzle/schema/subscriptions.schema";
import { users } from "../src/infrastructure/persistence/drizzle/schema/users.schema";

async function main() {
  const filterEmail = process.argv[2];
  const db = getDb();
  const stripe = getStripeClient();
  // Ensures Stripe env vars are validated.
  buildStripeBillingAdapter();
  const paymentRepo = new DrizzlePaymentRepository();

  const baseQuery = db
    .select({
      subId: subscriptions.id,
      userId: subscriptions.userId,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
      provider: subscriptions.provider,
      email: users.email,
    })
    .from(subscriptions)
    .innerJoin(users, eq(users.id, subscriptions.userId));

  const rows = filterEmail
    ? await baseQuery.where(eq(users.email, filterEmail))
    : await baseQuery;

  const stripeSubs = rows.filter(
    (r) => r.provider === "stripe" && r.providerSubscriptionId !== null,
  );
  console.log(`Found ${stripeSubs.length} stripe subs to inspect.`);

  let created = 0;
  let skipped = 0;

  for (const row of stripeSubs) {
    const subId = row.providerSubscriptionId as string;
    console.log(`→ ${row.email} (${subId})`);
    const invoiceList = await stripe.invoices.list({
      subscription: subId,
      limit: 100,
    });
    for (const inv of invoiceList.data) {
      if (!inv.id) continue;
      const existing = await paymentRepo.findByProviderPaymentId("stripe", inv.id);
      if (existing) {
        skipped += 1;
        continue;
      }
      const snapshot = mapStripeInvoice(inv);
      const now = new Date();
      await paymentRepo.save({
        id: crypto.randomUUID(),
        subscriptionId: row.subId,
        userId: row.userId,
        provider: "stripe",
        providerPaymentId: snapshot.providerPaymentId,
        amountCents: snapshot.amountCents,
        currency: snapshot.currency,
        status: snapshot.status === "paid" ? "succeeded" : "pending",
        paymentMethod: snapshot.paymentMethod,
        gatewayFeeCents: snapshot.gatewayFeeCents,
        paidAt: snapshot.paidAt,
        failedAt: null,
        failureReason: null,
        hostedInvoiceUrl: snapshot.hostedInvoiceUrl,
        createdAt: now,
      });
      created += 1;
      console.log(`  + ${inv.id} ${snapshot.amountCents} ${snapshot.currency} ${snapshot.status}`);
    }
  }

  console.log(`Done. Created ${created} payments, skipped ${skipped} already-present.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
