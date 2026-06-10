import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { LIFETIME_LIMIT } from "@/domain/entities/plan.entity";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";

import { SwapPlanCard } from "./_components/swap-plan-card.client";

export const metadata: Metadata = { title: "Ajustar plano" };

const LIFETIME_PERIOD_END = new Date("2099-12-31T23:59:59Z");

export default async function AjustarPlanoPage() {
  const user = await requireUser();
  const subRepo = repos.subscriptions;
  const planRepo = repos.plans;

  const sub = await subRepo.findActiveByUserId(user.id);
  const isPro = sub !== null && (sub.status === "active" || sub.status === "past_due");
  if (!isPro || !sub) {
    redirect("/app/configuracoes/planos" as Route);
  }

  const isLifetime =
    sub.currentPeriodEnd.getTime() >= LIFETIME_PERIOD_END.getTime() - 86400000;

  const allPlans = await planRepo.findActive();
  const lifetimePlan = allPlans.find((p) => p.billingInterval === "lifetime");
  const lifetimeSold = lifetimePlan ? await subRepo.countByPlanId(lifetimePlan.id) : 0;
  const lifetimeAvailable = lifetimeSold < LIFETIME_LIMIT;

  const ordered = [...allPlans].sort((a, b) => {
    const order = { month: 0, year: 1, lifetime: 2 } as const;
    return order[a.billingInterval] - order[b.billingInterval];
  });

  return (
    <PageShell
      title="Ajustar plano"
      description="Troque entre mensal e anual. A gente cobra só a diferença proporcional aos dias que faltavam."
      backHref={"/app/configuracoes/planos" as Route}
    >
      {isLifetime && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-[0.8125rem] font-semibold text-amber-800 dark:text-amber-300">
            Você é Pro vitalício.
          </p>
          <p className="mt-1 text-[0.75rem] text-amber-800/80 dark:text-amber-200/80">
            Vitalício é pra sempre, não dá pra trocar de cadência.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {ordered.map((plan) => {
          const isCurrent = sub.planId === plan.id;
          const lifetimeBlocked = plan.billingInterval === "lifetime" && !lifetimeAvailable;
          const blocked = isLifetime || lifetimeBlocked;
          return (
            <SwapPlanCard
              key={plan.id}
              plan={plan}
              isCurrent={isCurrent}
              blocked={blocked}
              blockedReason={
                isLifetime
                  ? "Vitalício é pra sempre."
                  : lifetimeBlocked
                    ? `Vitalício esgotou (${LIFETIME_LIMIT}/${LIFETIME_LIMIT}).`
                    : null
              }
              iconName={
                plan.billingInterval === "lifetime"
                  ? "infinity"
                  : plan.billingInterval === "year"
                    ? "sparkles"
                    : "crown"
              }
            />
          );
        })}
      </div>
    </PageShell>
  );
}
