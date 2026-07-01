import { Calculator, FileText, Pencil, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { listIncomes } from "@/application/use-cases/income/list-incomes.use-case";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { ActionRow, ActionRowGroup } from "../../_components/action-row";
import { PageShell } from "../../_components/page-shell";
import { IncomeOverflowMenu } from "../_components/income-overflow-menu.client";

import { loadIncomeTimeline } from "./_actions/income-timeline.action";
import { RendaDetailClient } from "./_components/renda-detail-client";

export const metadata: Metadata = { title: "Renda" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RendaDetailPage({ params }: PageProps) {
  await requireUser();
  const { id } = await params;
  const profileId = await getActiveProfileId();

  const r = await listIncomes({ incomes: repos.incomes }, { profileId });
  if (!isOk(r)) notFound();
  const income = r.value.find((i) => i.id === id);
  if (!income) notFound();

  const { timeline, totalReceivedCents } = await loadIncomeTimeline(id);

  const progressPct = (() => {
    if (!income.endDate) return null;
    const startMY = MonthYear.fromDate(income.startDate);
    const endMY = MonthYear.fromDate(income.endDate);
    const nowMY = MonthYear.fromDate(new Date());
    const totalMonths = (endMY.year - startMY.year) * 12 + (endMY.month - startMY.month) + 1;
    if (totalMonths <= 0) return null;
    const cappedNow = nowMY.isAfter(endMY) ? endMY : nowMY;
    const elapsedMonths = Math.max(
      0,
      (cappedNow.year - startMY.year) * 12 + (cappedNow.month - startMY.month) + 1,
    );
    return Math.max(0, Math.min(100, (elapsedMonths / totalMonths) * 100));
  })();

  return (
    <PageShell backHref={"/app/renda" as Route} backPreferFallback>
      <RendaDetailClient
        incomeId={id}
        label={income.label}
        frequency={income.frequency}
        isActive={income.isActive}
        isEstimated={income.isEstimated}
        startDate={income.startDate}
        endDate={income.endDate}
        progressPct={progressPct}
        initialTotalReceivedCents={totalReceivedCents}
        baseAmountCents={income.amount.toCents().toString()}
        initialTimeline={timeline}
        action={
          <IncomeOverflowMenu incomeId={id} label={income.label} isActive={income.isActive} />
        }
      >
        <ActionRowGroup>
          <ActionRow icon={Pencil} title="Editar renda" href={`/app/renda/${id}/editar` as Route} />
          <ActionRow
            icon={FileText}
            title="Contrato e anotações"
            href={`/app/renda/${id}/anotacoes` as Route}
          />
          <ActionRow
            icon={Calculator}
            title="Simuladores de renda"
            href={"/app/simular?category=trabalho" as Route}
          />
          <ActionRow
            icon={TrendingUp}
            title="Ver como seu mês fecha com essa renda"
            href={`/app/linha-do-tempo?jumpTo=${MonthYear.fromDate(new Date()).toIso()}` as Route}
          />
        </ActionRowGroup>
      </RendaDetailClient>
    </PageShell>
  );
}
