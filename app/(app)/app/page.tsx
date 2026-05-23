import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { CommitmentSectionClient } from "./_components/commitment-section.client";
import { CtaRow } from "./_components/cta-row";
import { DashboardHeroClient } from "./_components/dashboard-hero.client";
import { MaintenancePromptsClient } from "./_components/maintenance-prompts.client";
import { MercadoLink } from "./_components/mercado-link";
import { PageShell } from "./_components/page-shell";
import { TimelineLink } from "./_components/timeline-link";

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

  return (
    <PageShell
      title={`${greeting}, ${user.displayName ?? "bem-vindo"} 👋`}
      description="Aqui está sua situação agora."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Suspense fallback={<Skeleton className="h-[160px] rounded-2xl" />}>
            <DashboardHeroClient />
          </Suspense>
        </div>

        <div className="md:col-span-2">
          <CtaRow />
        </div>

        <div className="md:col-span-2">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Sua saúde financeira
          </h2>
          <Suspense fallback={<Skeleton className="h-[180px] rounded-[18px]" />}>
            <CommitmentSectionClient />
          </Suspense>
        </div>

        <div className="md:col-span-2">
          <Suspense fallback={<Skeleton className="h-[120px] rounded-2xl" />}>
            <MaintenancePromptsClient />
          </Suspense>
        </div>

        <div className="md:col-span-2">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Mais
          </h2>
          <div className="flex flex-col gap-2">
            <TimelineLink />
            <MercadoLink />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
