import { Bell } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { NextDueSectionClient } from "../_components/next-due-section.client";
import { PageShell } from "../_components/page-shell";

import { fetchNotifications } from "./_actions/list-notifications.action";
import { NotificationsTabs } from "./_components/notifications-tabs.client";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  await requireUser();
  const all = await fetchNotifications();
  const active = all.filter((n) => !n.dismissed);
  const dismissed = all.filter((n) => n.dismissed);

  return (
    <PageShell title="Notificações" description="Avisos do sistema.">
      <div className="flex flex-col gap-4">
        <Suspense fallback={<Skeleton className="h-[80px] rounded-2xl" />}>
          <NextDueSectionClient />
        </Suspense>
        {active.length === 0 && dismissed.length === 0 ? (
          <EmptyState />
        ) : (
          <NotificationsTabs active={active} dismissed={dismissed} />
        )}
      </div>
    </PageShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Bell size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-[14px] font-semibold text-[color:var(--text-primary)]">
        Sem notificações no momento.
      </p>
      <p className="text-[12px] text-[color:var(--text-secondary)]">
        Avisos importantes sobre seu fluxo financeiro vão aparecer aqui.
      </p>
    </div>
  );
}
