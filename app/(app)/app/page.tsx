import { Fragment, type ReactNode, Suspense } from "react";


import { Skeleton } from "@/app/components/ui/skeleton";
import { getMonthlyConsumo } from "@/application/use-cases/transaction/get-monthly-consumo.use-case";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";


import { fetchOutOfMonthSummary } from "./_actions/debt-queries";
import { fetchMaintenancePrompts } from "./_actions/maintenance-queries";
import { fetchOnboardingState } from "./_actions/onboarding";
import { fetchMonthClosing, fetchPlanningProjection } from "./_actions/planning-queries";
import { fetchMonthDetail } from "./_actions/timeline-month-detail";
import { CommitmentSectionClient } from "./_components/commitment-section.client";
import { ConsumoCard } from "./_components/consumo-card.client";
import { DashboardHeroClient } from "./_components/dashboard-hero.client";
import { HomeBringDataCard } from "./_components/home-bring-data-card";
import { HomeGoalCard } from "./_components/home-goal-card";
import { HomeProjectionCard } from "./_components/home-projection-card.client";
import { MaintenancePromptsClient } from "./_components/maintenance-prompts.client";
import { MonthClosingCard } from "./_components/month-closing-card.client";
import { NextStepCard } from "./_components/next-step-card";
import { OfflineStaleNote } from "./_components/offline-stale-note.client";
import { allChecklistDone } from "./_components/onboarding/checklist-items";
import { HomeCoachmarks } from "./_components/onboarding/home-coachmarks.client";
import { OnboardingChecklistCard } from "./_components/onboarding/onboarding-checklist-card.client";
import { PageShell } from "./_components/page-shell";
import { MarkValueMoment } from "./_components/pwa/mark-value-moment.client";
import { QuickAccessRow } from "./_components/quick-access-row";
import {
  type HomeCardKey,
  homeCardOrder,
  resolveHomeState,
} from "./_lib/home-layout";
import { getPrescription } from "./_lib/prescription-cache";

const ONBOARDING_ORDER: HomeCardKey[] = ["hero", "quickAccess", "nextStep"];

function greetingFor(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const profileId = await getActiveProfileId();

  const now = new Date();
  const greeting = greetingFor(now.getHours());
  const monthIso = MonthYear.fromDate(now).toIso();

  const consumoFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const consumoTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const [
    initialMonthDetail,
    initialMaintenancePrompts,
    onboardingState,
    projectionInitial,
    monthClosingInitial,
    prescription,
    consumo,
    outOfMonth,
    externalAccountKeys,
    mcpConnections,
  ] = await Promise.all([
    fetchMonthDetail({ monthIso }),
    fetchMaintenancePrompts(),
    fetchOnboardingState(),
    fetchPlanningProjection(),
    fetchMonthClosing(),
    getPrescription(),
    getMonthlyConsumo(
      { transactions: repos.transactions },
      { userId: user.id, from: consumoFrom, to: consumoTo },
    ),
    fetchOutOfMonthSummary(),
    repos.assets.listExternalAccountKeys(profileId),
    repos.mcpConnections.listForUser(user.id),
  ]);

  const hasImportedAccount = externalAccountKeys.some((k) => !k.endsWith(":reserve"));
  const hasMcpConnection = mcpConnections.some((c) => c.status === "active");
  const bringDataEligible =
    allChecklistDone(onboardingState.checklist) && !hasImportedAccount && !hasMcpConnection;

  const hasPlan = prescription?.hasPlan ?? false;
  const order = hasPlan
    ? homeCardOrder(
        resolveHomeState({
          hasDebt: onboardingState.checklist.hasDebt,
          prescriptionState: prescription?.state ?? "incomplete",
        }),
      )
    : ONBOARDING_ORDER;

  const cardNodes: Record<HomeCardKey, ReactNode> = {
    hero: (
      <div className="md:col-span-2" data-tour="hero">
        <Suspense fallback={<Skeleton className="h-[160px] rounded-2xl" />}>
          <DashboardHeroClient monthIso={monthIso} initialData={initialMonthDetail} />
        </Suspense>
      </div>
    ),
    quickAccess: (
      <div className="min-w-0 md:col-span-2" data-tour="quick-access">
        <QuickAccessRow />
      </div>
    ),
    nextStep: (
      <div id="movimento-do-mes" className="scroll-mt-20 md:col-span-2" data-tour="next-step">
        <Suspense fallback={<Skeleton className="h-[120px] rounded-[18px]" />}>
          <NextStepCard />
        </Suspense>
      </div>
    ),
    bringData: bringDataEligible ? (
      <div className="md:col-span-2">
        <HomeBringDataCard />
      </div>
    ) : null,
    commitment: (
      <div className="md:col-span-2" data-tour="health">
        <h2 className="mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Sua saúde financeira
        </h2>
        <Suspense fallback={<Skeleton className="h-[180px] rounded-[18px]" />}>
          <CommitmentSectionClient
            monthIso={monthIso}
            initialData={initialMonthDetail}
            hasDebt={onboardingState.checklist.hasDebt}
            outOfMonth={outOfMonth}
          />
        </Suspense>
      </div>
    ),
    projection: (
      <div className="md:col-span-2" data-tour="projection">
        <Suspense fallback={<Skeleton className="h-[72px] rounded-2xl" />}>
          <HomeProjectionCard initialData={projectionInitial} />
        </Suspense>
      </div>
    ),
    goal: (
      <div className="md:col-span-2" data-tour="goals">
        <Suspense fallback={<Skeleton className="h-[88px] rounded-2xl" />}>
          <HomeGoalCard />
        </Suspense>
      </div>
    ),
    monthClosing: (
      <div className="md:col-span-2">
        <Suspense fallback={<Skeleton className="h-[96px] rounded-2xl" />}>
          <MonthClosingCard initialData={monthClosingInitial} />
        </Suspense>
      </div>
    ),
    maintenance: (
      <div className="md:col-span-2">
        <Suspense fallback={<Skeleton className="h-[120px] rounded-2xl" />}>
          <MaintenancePromptsClient initialData={initialMaintenancePrompts} />
        </Suspense>
      </div>
    ),
  };

  return (
    <PageShell
      title={`${greeting}, ${user.displayName ?? "bem-vindo"}`}
      description="Aqui está sua situação agora."
    >
      <MarkValueMoment active={hasPlan} />
      <div className="grid gap-4 md:grid-cols-2">
        <HomeCoachmarks
          active={onboardingState.wizardSeen && !onboardingState.tourDismissed}
          hasGoal={onboardingState.checklist.hasGoal}
        />

        <OfflineStaleNote />

        <div className="md:col-span-2">
          <OnboardingChecklistCard checklist={onboardingState.checklist} />
        </div>

        {order.map((key) => (
          <Fragment key={key}>{cardNodes[key]}</Fragment>
        ))}

        <div className="md:col-span-2">
          <ConsumoCard
            total={Number(consumo.totalCents) / 100}
            essencial={Number(consumo.essencialCents) / 100}
            parcelado={Number(consumo.parceladoCents) / 100}
            resto={Number(consumo.restoCents) / 100}
          />
        </div>
      </div>
    </PageShell>
  );
}
