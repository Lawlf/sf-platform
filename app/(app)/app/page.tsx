import { LineChart, type LucideIcon, Target } from "lucide-react";
import type { Route } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchMaintenancePrompts } from "./_actions/maintenance-queries";
import { fetchOnboardingState } from "./_actions/onboarding";
import { fetchMonthDetail } from "./_actions/timeline-month-detail";
import { CommitmentSectionClient } from "./_components/commitment-section.client";
import { HomeCoachmarks } from "./_components/onboarding/home-coachmarks.client";
import { OnboardingChecklistCard } from "./_components/onboarding/onboarding-checklist-card.client";
import { DashboardHeroClient } from "./_components/dashboard-hero.client";
import { HomeGoalCard } from "./_components/home-goal-card";
import { MaintenancePromptsClient } from "./_components/maintenance-prompts.client";
import { MaisCard } from "./_components/mais-card";
import { NextStepCard } from "./_components/next-step-card";
import { PageShell } from "./_components/page-shell";
import { QuickAccessRow } from "./_components/quick-access-row";

interface MaisItem {
  href: Route;
  icon: LucideIcon;
  title: string;
  description: string;
}

const MAIS_ITEMS: MaisItem[] = [
  {
    href: "/app/metas" as Route,
    icon: Target,
    title: "Metas",
    description: "Defina objetivos e acompanhe o progresso mês a mês.",
  },
  {
    href: "/app/linha-do-tempo" as Route,
    icon: LineChart,
    title: "Linha do tempo",
    description: "Sua trajetória mês a mês: renda, dívidas, patrimônio.",
  },
];

function greetingFor(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const user = await requireUser();

  const now = new Date();
  const greeting = greetingFor(now.getHours());
  const monthIso = MonthYear.fromDate(now).toIso();

  const [initialMonthDetail, initialMaintenancePrompts, onboardingState] = await Promise.all([
    fetchMonthDetail({ monthIso }),
    fetchMaintenancePrompts(),
    fetchOnboardingState(),
  ]);

  return (
    <PageShell
      title={`${greeting}, ${user.displayName ?? "bem-vindo"} 👋`}
      description="Aqui está sua situação agora."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <HomeCoachmarks active={onboardingState.wizardSeen && !onboardingState.tourDismissed} />

        <div className="md:col-span-2">
          <OnboardingChecklistCard checklist={onboardingState.checklist} />
        </div>

        <div className="md:col-span-2">
          <Suspense fallback={<Skeleton className="h-[160px] rounded-2xl" />}>
            <DashboardHeroClient monthIso={monthIso} initialData={initialMonthDetail} />
          </Suspense>
        </div>

        <div className="min-w-0 md:col-span-2" data-tour="quick-access">
          <QuickAccessRow />
        </div>

        <div className="md:col-span-2" data-tour="next-step">
          <Suspense fallback={<Skeleton className="h-[120px] rounded-[18px]" />}>
            <NextStepCard />
          </Suspense>
        </div>

        <div className="md:col-span-2" data-tour="goals">
          <Suspense fallback={<Skeleton className="h-[88px] rounded-2xl" />}>
            <HomeGoalCard />
          </Suspense>
        </div>

        <div className="md:col-span-2" data-tour="health">
          <h2 className="mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Sua saúde financeira
          </h2>
          <Suspense fallback={<Skeleton className="h-[180px] rounded-[18px]" />}>
            <CommitmentSectionClient monthIso={monthIso} initialData={initialMonthDetail} />
          </Suspense>
        </div>

        <div className="md:col-span-2">
          <Suspense fallback={<Skeleton className="h-[120px] rounded-2xl" />}>
            <MaintenancePromptsClient initialData={initialMaintenancePrompts} />
          </Suspense>
        </div>

        <div className="md:col-span-2">
          <h2 className="mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Mais
          </h2>
          <div className="flex flex-col gap-2">
            {MAIS_ITEMS.map((item) => (
              <MaisCard key={item.href} {...item} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
