"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef } from "react";

import type { SerializedNotification } from "../_actions/list-notifications.action";
import { markAllNotificationsReadAction } from "../_actions/mark-all-read.action";

import { NotificationCard } from "./notification-card.client";
import { notificationDateLabel } from "./notification-date-label";

export interface NotificationsFeedProps {
  notifications: SerializedNotification[];
  hasUnread: boolean;
}

export function NotificationsFeed({ notifications, hasUnread }: NotificationsFeedProps) {
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current || !hasUnread) return;
    marked.current = true;
    // Marca como lidas no servidor para o badge zerar na próxima navegação.
    // Sem refresh aqui de propósito: os destaques de "não lida" continuam
    // visíveis nesta visita para o usuário enxergar o que é novo.
    void markAllNotificationsReadAction();
  }, [hasUnread]);

  const now = new Date();
  const groups: { label: string; items: SerializedNotification[] }[] = [];
  for (const n of notifications) {
    const label = notificationDateLabel(new Date(n.triggeredAtIso), now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Link
          href={"/app/perfil/notificacoes" as Route}
          className="focus-ring text-[0.75rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          Ajustar quais avisos você recebe
        </Link>
      </div>
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col gap-2">
          <h2 className="px-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
            {g.label}
          </h2>
          <div className="flex flex-col gap-2">
            {g.items.map((n) => (
              <NotificationCard key={n.id} notification={n} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
