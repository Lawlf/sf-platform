import { Fragment, type ReactNode, Suspense } from "react";


import { Skeleton } from "@/app/components/ui/skeleton";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { getConsistencyCard } from "@/application/use-cases/achievement/get-consistency-card.use-case";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";


import { fetchOutOfMonthSummary } from "./_actions/debt-queries";
import { fetchMaintenancePrompts } from "./_actions/maintenance-queries";
import { fetchOnboardingState } from "./_actions/onboarding";
import { fetchMonthClosing, fetchPlanningProjection } from "./_actions/planning-queries";
import { fetchMonthDetail } from "./_actions/timeline-month-detail";
import { CommitmentSectionClient } from "./_components/commitment-section.client";
import { DashboardHeroClient } from "./_components/dashboard-hero.client";
import { HomeBringDataCard } from "./_components/home-bring-data-card";
import { HomeConsistencyDelta } from "./_components/home-consistency-delta";
import { IncomeConfirmCard } from "./_components/income-confirm-card.client";
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const profileId = await getActiveProfileId();

  const now = new Date();
  const greeting = greetingFor(now.getHours());
  const monthIso = MonthYear.fromDate(now).toIso();
  const prevMonthIso = MonthYear.fromDate(now).previous().toIso();
  const prevMonthName = capitalize(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toLocaleDateString("pt-BR", {
      month: "long",
    }),
  );

  const [
    initialMonthDetail,
    prevMonthDetail,
    initialMaintenancePrompts,
    onboardingState,
    projectionInitial,
    monthClosingInitial,
    prescription,
    outOfMonth,
    externalAccountKeys,
    mcpConnections,
  ] = await Promise.all([
    fetchMonthDetail({ monthIso }),
    fetchMonthDetail({ monthIso: prevMonthIso }),
    fetchMaintenancePrompts(),
    fetchOnboardingState(),
    fetchPlanningProjection(),
    fetchMonthClosing(),
    getPrescription(),
    fetchOutOfMonthSummary(),
    repos.assets.listExternalAccountKeys(profileId),
    repos.mcpConnections.listForUser(user.id),
  ]);

  const previousMonth =
    prevMonthDetail && BigInt(prevMonthDetail.totals.income.cents) > 0n
      ? { label: prevMonthName, freeCents: prevMonthDetail.totals.realizedFree.cents }
      : null;
  const achievementStory = initialMonthDetail?.stories?.find((s) => s.kind === "achievement");
  const milestone = achievementStory
    ? (/\[\[(.+?)\]\]/.exec(achievementStory.line)?.[1] ?? null)
    : null;

  const consistency = await getConsistencyCard(
    { usage: repos.usage, closings: repos.monthClosings, now: () => clock.now() },
    { userId: user.id, profileId, state: prescription?.state ?? "incomplete" },
  );

  const todayDate = new Date().toISOString().slice(0, 10);
  const incomesToConfirm = (initialMonthDetail?.incomes ?? []).filter(
    (i) => i.isEstimated && i.settledStatus === null && i.dateIso.slice(0, 10) <= todayDate,
  );

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
          <DashboardHeroClient
            monthIso={monthIso}
            initialData={initialMonthDetail}
            previousMonth={previousMonth}
            milestone={milestone}
          />
        </Suspense>
      </div>
    ),
    quickAccess: (
      <div className="min-w-0 md:col-span-2" data-tour="quick-access">
        <QuickAccessRow />
      </div>
    ),
    incomeConfirm:
      incomesToConfirm.length > 0 && initialMonthDetail ? (
        <div className="md:col-span-2">
          <IncomeConfirmCard incomes={initialMonthDetail.incomes} monthIso={monthIso} />
        </div>
      ) : null,
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
    consistencyDelta:
      consistency.delta && consistency.delta.direction === "positive" ? (
        <div className="md:col-span-2">
          <HomeConsistencyDelta delta={consistency.delta} />
        </div>
      ) : null,
    maintenance: (
      <div className="md:col-span-2">
        <Suspense fallback={<Skeleton className="h-[120px] rounded-2xl" />}>
          <MaintenancePromptsClient initialData={initialMaintenancePrompts} />
        </Suspense>
      </div>
    ),
  };

  const topKeys = new Set<HomeCardKey>([
    "hero",
    "quickAccess",
    "nextStep",
    "incomeConfirm",
    "bringData",
  ]);
  const firstDetailKey = order.find((k) => !topKeys.has(k) && cardNodes[k] != null);

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

        {allChecklistDone(onboardingState.checklist) ? null : (
          <div className="md:col-span-2 xl:fixed xl:bottom-6 xl:right-6 xl:z-40 xl:w-80 xl:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]">
            <OnboardingChecklistCard checklist={onboardingState.checklist} />
          </div>
        )}

        {order.map((key) => (
          <Fragment key={key}>
            {key === firstDetailKey ? (
              <h2 className="mt-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)] md:col-span-2">
                Seu mês em detalhe
              </h2>
            ) : null}
            {cardNodes[key]}
          </Fragment>
        ))}
      </div>
    </PageShell>
  );
}
