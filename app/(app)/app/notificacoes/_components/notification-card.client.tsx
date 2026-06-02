"use client";

import { AlertTriangle, Bell, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { dismissNotificationAction } from "../_actions/dismiss-notification.action";
import type { SerializedNotification } from "../_actions/list-notifications.action";

const ICON_MAP: Record<string, LucideIcon> = {
  AlertTriangle,
  Bell,
};

function renderLine(line: string) {
  const parts = line.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export interface NotificationCardProps {
  notification: SerializedNotification;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const [pending, startTransition] = useTransition();
  const Icon = ICON_MAP[notification.iconName] ?? Bell;
  const dismissed = notification.dismissed;

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissNotificationAction({ notificationId: notification.id });
      if (!result.ok) {
        toast.error(result.message || "Não foi possível dispensar a notificação.");
      }
    });
  }

  return (
    <article
      className={`relative flex items-start gap-3 rounded-xl p-4 ${
        dismissed
          ? "border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] opacity-70"
          : "border border-[color:var(--semantic-negative)]/20 bg-[color:var(--semantic-negative)]/[0.08]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          dismissed
            ? "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"
            : "bg-[color:var(--semantic-negative)]/[0.14] text-[color:var(--semantic-negative)]"
        }`}
      >
        <Icon size={16} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[0.625rem] font-bold uppercase tracking-[0.5px] ${
            dismissed ? "text-[color:var(--text-muted)]" : "text-[color:var(--semantic-negative)]"
          }`}
        >
          {notification.eyebrow}
        </div>
        <p className="mt-1 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
          {renderLine(notification.line)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
          {notification.triggeredAtLabel}
        </span>
        {!dismissed ? (
          <button
            type="button"
            onClick={handleDismiss}
            disabled={pending}
            aria-label="Dispensar notificação"
            className="focus-ring flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={14} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>
    </article>
  );
}
