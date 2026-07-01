import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Calculator, Plus, TrendingUp } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { DEBT_DUE_DAYS_BEFORE_DEFAULT } from "@/domain/entities/notification-preferences.entity";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import {
  fetchDebts,
  fetchOutOfMonthSummary,
  type DebtStatusFilter,
} from "../_actions/debt-queries";
import { HowItWorksSheet } from "../_components/how-it-works-sheet";
import { PageShell } from "../_components/page-shell";
import { getServerQueryClient } from "../_lib/query-client.server";
import { queryKeys } from "../_lib/query-keys";

import { fetchOverdueDues } from "./_actions/overdue-list";
import { fetchHasDueDatedDebt, fetchUpcomingDues } from "./_actions/upcoming-dues";
import { DividasHero } from "./_components/dividas-hero";
import { DividasListClient } from "./_components/dividas-list.client";
import { DueAgenda } from "./_components/due-agenda.client";
import { DueAlertSettingsButton } from "./_components/due-alert-settings-button.client";
import { OverdueDebtsBanner } from "./_components/overdue-debts-banner.client";

export const metadata: Metadata = { title: "Dívidas" };

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DividasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const statusFilter: DebtStatusFilter =
    sp.status === "all" || sp.status === "paid_off" || sp.status === "written_off"
      ? sp.status
      : "active";

  const user = await requireUser();
  const prefs = await repos.notificationPreferences.findForUser(user.id);
  const [upcomingDues, hasDueDatedDebt, overdueDues, activeDebts, outOfMonth] = await Promise.all([
    fetchUpcomingDues(),
    fetchHasDueDatedDebt(),
    fetchOverdueDues(),
    fetchDebts({ status: "active" }),
    fetchOutOfMonthSummary(),
  ]);

  const owedDebts = activeDebts.filter((d) => d.kind !== "recurring");
  const totalOwedCents = owedDebts.reduce((acc, d) => acc + BigInt(d.currentBalance.cents), 0n);
  const totalOwedFormatted = (Number(totalOwedCents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const queryClient = getServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.debts(statusFilter),
    queryFn: () => fetchDebts({ status: statusFilter }),
  });

  const now = new Date();
  const currentMonthIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <PageShell
      title="Dívidas"
      description="Acompanhe e simule a quitação das suas dívidas."
      headerAction={
        <div className="flex items-center gap-2">
          <HowItWorksSheet
            topic="dividas"
            variant="brand"
            actions={[
              {
                icon: <TrendingUp size={18} strokeWidth={2} aria-hidden />,
                label: "Ver como seu mês fecha com suas dívidas",
                href: `/app/linha-do-tempo?jumpTo=${currentMonthIso}` as Route,
              },
              {
                icon: <Calculator size={18} strokeWidth={2} aria-hidden />,
                label: "Simuladores de dívida",
                href: "/app/simular?category=dividas" as Route,
              },
            ]}
          />
          {hasDueDatedDebt ? (
            <DueAlertSettingsButton
              isPro={user.isPro}
              initialEnabled={prefs?.debtDueEnabled ?? true}
              initialDaysBefore={prefs?.debtDueDaysBefore ?? DEBT_DUE_DAYS_BEFORE_DEFAULT}
            />
          ) : null}
          <Link
            href={"/app/dividas/nova" as Route}
            className="focus-ring flex items-center gap-1.5 rounded-xl bg-[color:var(--color-brand-500)] px-3.5 py-2 text-[0.8125rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.3)] transition-colors hover:bg-[color:var(--color-brand-600)]"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            Nova
          </Link>
        </div>
      }
    >
      <DividasHero
        totalOwedFormatted={totalOwedFormatted}
        activeCount={owedDebts.length}
        outOfMonthCount={outOfMonth.count}
        outOfMonthFormatted={outOfMonth.total.formatted}
      />

      <OverdueDebtsBanner overdue={overdueDues} />

      <DueAgenda dues={upcomingDues} hasDueDatedDebt={hasDueDatedDebt} />

      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense key={statusFilter} fallback={<DividasListSkeleton />}>
          <DividasListClient statusFilter={statusFilter} />
        </Suspense>
      </HydrationBoundary>
    </PageShell>
  );
}

function DividasListSkeleton() {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[76px] rounded-2xl" />
      ))}
    </div>
  );
}
