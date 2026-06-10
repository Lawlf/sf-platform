import type { Metadata } from "next";

import { DEFAULT_PLAN_SLUG } from "@/application/use-cases/billing/create-checkout-session.use-case";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { CelebrationClient } from "./_components/celebration.client";

export const metadata: Metadata = { title: "Bem-vindo ao Pro" };

interface PageProps {
  searchParams?: Promise<{ session_id?: string }>;
}

const LIFETIME_PERIOD_END = new Date("2099-12-31T23:59:59Z");

export default async function CheckoutSucessoPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const sessionId = params.session_id ?? null;

  const subRepo = repos.subscriptions;
  const planRepo = repos.plans;
  const sub = await subRepo.findActiveByUserId(user.id);
  const defaultPlan = await planRepo.findBySlug(DEFAULT_PLAN_SLUG);

  const isActive = sub !== null && (sub.status === "active" || sub.status === "past_due");
  const priceCents = Number(sub?.priceCents ?? defaultPlan?.priceCents ?? 1990n);
  const periodEndIso = sub?.currentPeriodEnd.toISOString() ?? null;
  const isLifetime = sub
    ? sub.currentPeriodEnd.getTime() >= LIFETIME_PERIOD_END.getTime() - 86400000
    : false;

  return (
    <CelebrationClient
      isActive={isActive}
      isLifetime={isLifetime}
      priceCents={priceCents}
      periodEndIso={periodEndIso}
      sessionId={sessionId}
      userName={user.displayName ?? null}
    />
  );
}
