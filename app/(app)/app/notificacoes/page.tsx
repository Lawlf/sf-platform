import { Bell } from "lucide-react";
import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";

import { fetchNotifications } from "./_actions/list-notifications.action";
import { NotificationsFeed } from "./_components/notifications-feed.client";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  await requireUser();
  const all = await fetchNotifications();
  const hasUnread = all.some((n) => !n.read);

  return (
    <PageShell title="Notificações" description="O que mudou nas suas contas, dívidas e metas.">
      <div className="flex flex-col gap-4">
        {all.length === 0 ? (
          <EmptyState />
        ) : (
          <NotificationsFeed notifications={all} hasUnread={hasUnread} />
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
      <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
        Sem notificações no momento.
      </p>
      <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
        Quando algo mudar nas suas contas, dívidas ou metas, o aviso aparece aqui.
      </p>
    </div>
  );
}
