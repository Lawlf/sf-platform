import { PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { DEBT_DUE_DAYS_BEFORE_DEFAULT } from "@/domain/entities/notification-preferences.entity";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import type { DebtStatusFilter } from "../_actions/debt-queries";
import { PageShell } from "../_components/page-shell";

import { fetchUpcomingDues } from "./_actions/upcoming-dues";
import { DebtDueBanner } from "./_components/debt-due-banner.client";
import { DebtDueReminderCard } from "./_components/debt-due-reminder.client";
import { DividasFilterPills } from "./_components/dividas-filter-pills";
import { DividasListClient } from "./_components/dividas-list.client";

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
  const upcomingDues = await fetchUpcomingDues();

  return (
    <PageShell title="Dívidas" description="Acompanhe e simule a quitação das suas dívidas.">
      <Link
        href={"/app/dividas/nova" as Route}
        className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105"
      >
        <PlusCircle size={16} strokeWidth={2} aria-hidden />
        Adicionar compra, conta ou dívida
      </Link>

      <DebtDueBanner dues={upcomingDues} />

      <DividasFilterPills />

      <Suspense key={statusFilter} fallback={<DividasListSkeleton />}>
        <DividasListClient statusFilter={statusFilter} />
      </Suspense>

      <DebtDueReminderCard
        isPro={user.isPro}
        initialEnabled={prefs?.debtDueEnabled ?? true}
        initialDaysBefore={prefs?.debtDueDaysBefore ?? DEBT_DUE_DAYS_BEFORE_DEFAULT}
      />
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
