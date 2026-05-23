/**
 * Grant cortesia Pro subscription to a user.
 *
 * Usage:
 *   pnpm tsx scripts/grant-pro.ts <email> <plan-slug>
 *
 * Examples:
 *   pnpm tsx scripts/grant-pro.ts torofote@gmail.com pro-yearly
 *   pnpm tsx scripts/grant-pro.ts founder@x.com pro-lifetime
 *
 * Creates a subscription with provider="manual" (no Stripe charge).
 * Marks user as Pro. Idempotent: re-running upserts the active sub.
 */
import { eq } from "drizzle-orm";

import { getDb } from "../src/infrastructure/persistence/drizzle/client";
import { plans } from "../src/infrastructure/persistence/drizzle/schema/plans.schema";
import { subscriptions } from "../src/infrastructure/persistence/drizzle/schema/subscriptions.schema";
import { users } from "../src/infrastructure/persistence/drizzle/schema/users.schema";

const LIFETIME_PERIOD_END = new Date("2099-12-31T23:59:59Z");

async function main() {
  const [, , email, planSlug] = process.argv;
  if (!email || !planSlug) {
    console.error("Usage: pnpm tsx scripts/grant-pro.ts <email> <plan-slug>");
    process.exit(1);
  }

  const db = getDb();

  const userRow = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!userRow[0]) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  const user = userRow[0];

  const planRow = await db.select().from(plans).where(eq(plans.slug, planSlug)).limit(1);
  if (!planRow[0]) {
    console.error(`Plan not found: ${planSlug}`);
    process.exit(1);
  }
  const plan = planRow[0];

  const now = new Date();
  let currentPeriodEnd: Date;
  switch (plan.billingInterval) {
    case "month":
      currentPeriodEnd = new Date(now.getTime() + 30 * 86400000);
      break;
    case "year":
      currentPeriodEnd = new Date(now.getTime() + 365 * 86400000);
      break;
    case "lifetime":
      currentPeriodEnd = LIFETIME_PERIOD_END;
      break;
  }

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(50);
  const active = existing.find((s) =>
    ["active", "past_due", "incomplete"].includes(s.status),
  );

  if (active) {
    await db
      .update(subscriptions)
      .set({
        planId: plan.id,
        status: "active",
        priceCents: plan.priceCents,
        currency: plan.currency,
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        endedAt: null,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, active.id));
    console.log(`Updated existing sub ${active.id} to plan ${plan.slug}`);
  } else {
    await db.insert(subscriptions).values({
      userId: user.id,
      planId: plan.id,
      provider: "manual",
      providerSubscriptionId: null,
      providerCustomerId: null,
      status: "active",
      priceCents: plan.priceCents,
      currency: plan.currency,
      currentPeriodStart: now,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created manual sub for ${email} on plan ${plan.slug}`);
  }

  await db
    .update(users)
    .set({ isPro: true, plan: "pro", updatedAt: now })
    .where(eq(users.id, user.id));

  console.log(`[grant-pro] ${email} → Pro (${plan.name}, ends ${currentPeriodEnd.toISOString()})`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[grant-pro] failed:", e);
  process.exit(1);
});
