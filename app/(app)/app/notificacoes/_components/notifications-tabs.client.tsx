"use client";

import { Bell } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

import type { SerializedNotification } from "../_actions/list-notifications.action";

import { NotificationCard } from "./notification-card.client";

export interface NotificationsTabsProps {
  active: SerializedNotification[];
  dismissed: SerializedNotification[];
}

export function NotificationsTabs({ active, dismissed }: NotificationsTabsProps) {
  return (
    <Tabs defaultValue="active" className="flex flex-col gap-3">
      <TabsList className="self-start gap-1 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-1 text-[color:var(--text-secondary)]">
        <TabsTrigger
          value="active"
          className="rounded-full px-4 py-1.5 text-[0.75rem] font-semibold data-[state=active]:bg-[color:var(--color-brand-500)]/[0.14] data-[state=active]:text-[color:var(--color-brand-800)] data-[state=active]:shadow-none"
        >
          Ativas ({active.length})
        </TabsTrigger>
        <TabsTrigger
          value="dismissed"
          className="rounded-full px-4 py-1.5 text-[0.75rem] font-semibold data-[state=active]:bg-[color:var(--color-brand-500)]/[0.14] data-[state=active]:text-[color:var(--color-brand-800)] data-[state=active]:shadow-none"
        >
          Dispensadas ({dismissed.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="flex flex-col gap-2">
        {active.length === 0 ? (
          <TabEmptyState
            title="Sem notificações ativas no momento."
            description="Avisos importantes sobre seu fluxo financeiro vão aparecer aqui."
          />
        ) : (
          active.map((n) => <NotificationCard key={n.id} notification={n} />)
        )}
      </TabsContent>

      <TabsContent value="dismissed" className="flex flex-col gap-2">
        {dismissed.length === 0 ? (
          <TabEmptyState
            title="Nenhuma notificação dispensada."
            description="As notificações que você dispensar ficam guardadas aqui."
          />
        ) : (
          dismissed.map((n) => <NotificationCard key={n.id} notification={n} />)
        )}
      </TabsContent>
    </Tabs>
  );
}

function TabEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Bell size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">{title}</p>
      <p className="text-[0.75rem] text-[color:var(--text-secondary)]">{description}</p>
    </div>
  );
}
