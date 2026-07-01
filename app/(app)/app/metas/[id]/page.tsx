import { FileText, SlidersHorizontal, TrendingUp } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { ActionRow, ActionRowGroup } from "../../_components/action-row";
import { HowItWorksSheet, type HowItWorksTopic } from "../../_components/how-it-works-sheet";
import { PageShell } from "../../_components/page-shell";
import { ResultCard } from "../../simular/_components/sim-result";
import { fetchGoalDetail } from "../_actions/goal-queries";

import { ContributionSheet } from "./_components/contribution-sheet.client";
import { ContributionsList } from "./_components/contributions-list.client";
import { GoalEtaCard } from "./_components/goal-eta-card";
import { GoalEvolutionChart } from "./_components/goal-evolution-chart";
import { GoalHeader } from "./_components/goal-header";
import { GoalLinkSheet } from "./_components/goal-link-sheet.client";
import { GoalSettingsSheet } from "./_components/goal-settings-sheet.client";

export const metadata: Metadata = { title: "Detalhe da meta" };

// Dynamic because we upsert a snapshot on each load.
export const dynamic = "force-dynamic";

const SIM_ROUTE: Record<string, Route> = {
  emergency_fund: "/app/simular/reserva" as Route,
  savings: "/app/simular/meta" as Route,
  financial_independence: "/app/simular/independencia" as Route,
  debt_payoff: "/app/simular/quitacao" as Route,
};

const TOPIC_BY_TYPE: Record<string, HowItWorksTopic> = {
  debt_payoff: "meta-quitar",
  emergency_fund: "meta-reserva",
  savings: "meta-juntar",
  financial_independence: "meta-independencia",
};

interface GoalLinkOption {
  id: string;
  label: string;
}

async function fetchDebtOptions(profileId: string): Promise<GoalLinkOption[]> {
  const r = await listDebts({ debts: repos.debts }, { profileId, status: "active" });
  if (!isOk(r)) return [];
  return r.value.map((d) => ({ id: d.id, label: d.label }));
}

async function fetchCashAssetOptions(profileId: string): Promise<GoalLinkOption[]> {
  const assets = await repos.assets.findActiveByProfile(profileId);
  return assets.filter((a) => a.category === "cash").map((a) => ({ id: a.id, label: a.label }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GoalDetailPage({ params }: Props) {
  await requireUser();
  const profileId = await getActiveProfileId();

  const { id } = await params;
  const detail = await fetchGoalDetail(id);

  if (!detail) {
    notFound();
  }

  // On-open snapshot refresh: upsert current-month data point so the curve stays fresh.
  try {
    const now = new Date();
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const snapshotRepo = repos.goalSnapshots;
    await snapshotRepo.upsert({
      goalId: detail.goal.id,
      month,
      currentCents: BigInt(detail.progress.currentCents),
      targetCents: BigInt(detail.progress.targetCents),
      capturedAt: now,
    });
  } catch {
    // Write failure must never break the page render.
  }

  const { goal, progress, etaLocked, snapshots, contributions } = detail;
  const simRoute = SIM_ROUTE[goal.type];
  const howItWorksTopic = TOPIC_BY_TYPE[goal.type];
  const currentMonthIso = MonthYear.fromDate(new Date()).toIso();

  const linkOptions =
    goal.type === "debt_payoff"
      ? await fetchDebtOptions(profileId)
      : goal.type === "emergency_fund"
        ? await fetchCashAssetOptions(profileId)
        : null;

  return (
    <PageShell backHref={"/app/metas" as Route} backPreferFallback>
      <GoalHeader
        goal={goal}
        progress={progress}
        action={
          <div className="flex shrink-0 items-center gap-2">
            {howItWorksTopic ? (
              <HowItWorksSheet
                topic={howItWorksTopic}
                variant="brand"
                actions={[
                  ...(simRoute
                    ? [
                        {
                          icon: <SlidersHorizontal size={18} strokeWidth={2} aria-hidden />,
                          label: "Simular esta meta",
                          href: simRoute,
                        },
                      ]
                    : []),
                  {
                    icon: <TrendingUp size={18} strokeWidth={2} aria-hidden />,
                    label: "Ver como seu mês fecha",
                    href: `/app/linha-do-tempo?jumpTo=${currentMonthIso}` as Route,
                  },
                ]}
              />
            ) : null}
            <GoalSettingsSheet goalId={goal.id} goalTitle={goal.title} />
          </div>
        }
      />

      {goal.type === "emergency_fund" && goal.monthlyCostCents === null ? (
        <p className="px-1 text-[0.75rem] text-[color:var(--text-muted)]">
          Reserva estimada a partir da sua renda (cerca de 75% dela). Você ajusta depois.
        </p>
      ) : null}

      <GoalEtaCard
        goalId={goal.id}
        etaLocked={etaLocked}
        etaMonths={progress.etaMonths}
        reached={progress.reached}
      />

      <ActionRowGroup>
        {goal.type === "emergency_fund" ? (
          <ContributionSheet
            goalId={goal.id}
            variant="reserve"
            hasReserve={goal.linkedAssetId !== null}
          />
        ) : goal.type === "savings" && goal.fundingMode === "manual" ? (
          <ContributionSheet goalId={goal.id} variant="savings" />
        ) : null}
        {goal.type === "debt_payoff" ? (
          <GoalLinkSheet
            goalId={goal.id}
            type="debt_payoff"
            currentLinkedId={goal.linkedDebtId}
            options={linkOptions ?? []}
          />
        ) : goal.type === "emergency_fund" ? (
          <GoalLinkSheet
            goalId={goal.id}
            type="emergency_fund"
            currentLinkedId={goal.linkedAssetId}
            options={linkOptions ?? []}
          />
        ) : null}
        {simRoute ? <ActionRow icon={SlidersHorizontal} title="Simular" href={simRoute} /> : null}
        <ActionRow
          icon={FileText}
          title="Anotações"
          href={`/app/metas/${goal.id}/anotacoes` as Route}
        />
      </ActionRowGroup>

      <ResultCard title="Evolução" subtitle="Saldo mensal registrado">
        <GoalEvolutionChart snapshots={snapshots} />
      </ResultCard>
      <ContributionsList contributions={contributions} />
    </PageShell>
  );
}
