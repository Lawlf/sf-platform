import { ChevronRight, CreditCard, Scale } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { DEFAULT_PLAN_SLUG } from "@/application/use-cases/billing/create-checkout-session.use-case";
import { LIFETIME_LIMIT } from "@/domain/entities/plan.entity";
import { accessEndDate } from "@/domain/entities/subscription.entity";
import { DrizzlePaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-payment.repository";
import { DrizzlePlanRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-plan.repository";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import { CancelDialog } from "./_components/cancel-dialog.client";
import {
  CardUpdatedBanner,
  CheckoutCanceledBanner,
  PastDueBanner,
} from "./_components/checkout-banners";
import { PaymentHistoryList } from "./_components/payment-history-list";
import { PlanPicker } from "./_components/plan-picker";
import { PlanStatusCard } from "./_components/plan-status-card";
import { RefreshPaymentsButton } from "./_components/refresh-payments-button.client";
import { UpdateCardButton } from "./_components/update-card-button.client";

export const metadata: Metadata = { title: "Plano" };

const PAGE_SIZE = 10;
const LIFETIME_PERIOD_END = new Date("2099-12-31T23:59:59Z");

interface PageProps {
  searchParams?: Promise<{ canceled?: string; card?: string; p?: string }>;
}

const fmtDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const fmtDateLong = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[color:var(--border-soft)] pt-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.8px] text-[color:var(--text-muted)]">
          {label}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export default async function ConfiguracoesPlanosPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const page = parsePage(params.p);

  const subRepo = new DrizzleSubscriptionRepository();
  const paymentRepo = new DrizzlePaymentRepository();
  const planRepo = new DrizzlePlanRepository();
  const sub = await subRepo.findActiveByUserId(user.id);
  const totalPayments = await paymentRepo.countByUserId(user.id);
  const pageCount = Math.max(1, Math.ceil(totalPayments / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const payments = await paymentRepo.findByUserId(
    user.id,
    PAGE_SIZE,
    (safePage - 1) * PAGE_SIZE,
  );
  const defaultPlan = await planRepo.findBySlug(DEFAULT_PLAN_SLUG);
  const displayPriceCents = Number(sub?.priceCents ?? defaultPlan?.priceCents ?? 1990n);

  const isPro = sub !== null && (sub.status === "active" || sub.status === "past_due");
  const isLifetime =
    sub !== null &&
    sub.currentPeriodEnd.getTime() >= LIFETIME_PERIOD_END.getTime() - 86400000;

  const activePlans = await planRepo.findActive();
  const currentPlan = sub?.planId
    ? (activePlans.find((p) => p.id === sub.planId) ?? null)
    : null;
  const currentInterval = currentPlan?.billingInterval ?? null;

  const isStripeRecurring =
    isPro && sub !== null && sub.provider === "stripe" && !isLifetime;
  const showCancel = isStripeRecurring && sub !== null && !sub.cancelAtPeriodEnd;
  const canRefreshPayments =
    isPro && sub !== null && sub.provider === "stripe" && sub.providerSubscriptionId !== null;

  const lifetimePlan = activePlans.find((p) => p.billingInterval === "lifetime");
  const lifetimeSold = lifetimePlan ? await subRepo.countByPlanId(lifetimePlan.id) : 0;
  const availablePlans = sub
    ? []
    : activePlans.filter(
        (p) => p.billingInterval !== "lifetime" || lifetimeSold < LIFETIME_LIMIT,
      );

  return (
    <PageShell
      title="Plano"
      description="Seu plano, pagamento e faturas."
      backHref={"/app/configuracoes" as Route}
    >
      {params.canceled === "1" && <CheckoutCanceledBanner />}
      {params.card === "ok" && <CardUpdatedBanner />}
      {sub?.status === "past_due" && (
        <PastDueBanner accessUntil={fmtDate.format(accessEndDate(sub))} />
      )}

      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
        <PlanStatusCard sub={sub} priceCents={displayPriceCents} interval={currentInterval} />
      </div>

      {!sub && availablePlans.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.8px] text-[color:var(--text-muted)]">
            Escolher plano
          </h2>
          <PlanPicker plans={availablePlans} />
          <Link
            href={"/app/configuracoes/planos/comparar" as Route}
            className="focus-ring group flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-700)]">
              <Scale size={18} strokeWidth={2} aria-hidden />
            </span>
            <div className="flex-1">
              <p className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                Comparar Free vs Pro
              </p>
              <p className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
                Veja item por item o que cada plano entrega.
              </p>
            </div>
            <ChevronRight
              size={18}
              strokeWidth={2}
              className="text-[color:var(--color-brand-800)] transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </section>
      )}

      {isStripeRecurring && (
        <Section label="Pagamento">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-[color:var(--text-secondary)]">
                <CreditCard size={16} strokeWidth={2} aria-hidden />
              </span>
              <div>
                <p className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
                  Cartão via Stripe
                </p>
                <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
                  Cobrança automática no método salvo.
                </p>
              </div>
            </div>
            <UpdateCardButton />
          </div>
        </Section>
      )}

      <Section
        label="Faturas"
        action={canRefreshPayments ? <RefreshPaymentsButton /> : undefined}
      >
        <PaymentHistoryList
          payments={payments}
          page={safePage}
          pageCount={pageCount}
          totalCount={totalPayments}
        />
      </Section>

      {showCancel && sub && (
        <Section label="Cancelamento">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
                Cancelar plano
              </p>
              <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
                Mantém acesso até o fim do período pago.
              </p>
            </div>
            <CancelDialog
              variant="primary-sm"
              accessUntilLabel={fmtDateLong.format(sub.currentPeriodEnd)}
            />
          </div>
        </Section>
      )}
    </PageShell>
  );
}
