"use client";

import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import { respondInviteAction } from "../../_actions/household-actions";

import type { SerializedNotification } from "../_actions/list-notifications.action";

interface HouseholdInviteCardProps {
  notification: SerializedNotification;
}

export function HouseholdInviteCard({ notification }: HouseholdInviteCardProps) {
  const [acceptPending, startAccept] = useTransition();
  const [declinePending, startDecline] = useTransition();
  const router = useRouter();

  const inviteId = notification.inviteId;

  const unread = !notification.read;

  function handleRespond(accept: boolean) {
    if (!inviteId) return;
    const start = accept ? startAccept : startDecline;
    start(async () => {
      const result = await respondInviteAction({ inviteId, accept });
      if (!result.ok) alert(result.message);
      else router.refresh();
    });
  }

  const baseClass = `relative flex items-start gap-3 rounded-xl border p-4 transition-colors ${
    unread
      ? "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
      : "border-transparent bg-[color:var(--surface-1)]/50"
  }`;

  const already = !inviteId;

  return (
    <article className={baseClass}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Home size={16} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--color-brand-800)]">
          {notification.eyebrow}
        </div>
        <p className="mt-1 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
          {notification.line}
        </p>
        {notification.description ? (
          <p className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
            {notification.description}
          </p>
        ) : null}
        {!already ? (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              loading={acceptPending}
              disabled={declinePending}
              onClick={() => handleRespond(true)}
            >
              Aceitar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={declinePending}
              disabled={acceptPending}
              onClick={() => handleRespond(false)}
            >
              Recusar
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
          {notification.triggeredAtLabel}
        </span>
        {unread ? (
          <span aria-label="Não lida" className="h-2 w-2 rounded-full bg-[color:var(--color-brand-500)]" />
        ) : null}
      </div>
    </article>
  );
}
