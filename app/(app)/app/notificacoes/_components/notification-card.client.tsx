"use client";

import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bell,
  CalendarCheck,
  CalendarHeart,
  CircleCheckBig,
  HeartPulse,
  Home,
  LineChart,
  type LucideIcon,
  Map,
  Medal,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { SerializedNotification } from "../_actions/list-notifications.action";

const ICON_MAP: Record<string, LucideIcon> = {
  AlertTriangle,
  Bell,
  Award,
  CalendarCheck,
  CalendarHeart,
  CircleCheckBig,
  HeartPulse,
  Home,
  LineChart,
  Map,
  Medal,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
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
  const Icon = ICON_MAP[notification.iconName] ?? Bell;
  const isPositive = notification.kind === "achievement_unlocked";
  const unread = !notification.read;

  const accentText = isPositive
    ? "text-[color:var(--color-brand-800)]"
    : "text-[color:var(--semantic-negative)]";
  const accentChip = isPositive
    ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
    : "bg-[color:var(--semantic-negative)]/[0.14] text-[color:var(--semantic-negative)]";

  const inner = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentChip}`}>
        <Icon size={16} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-[0.625rem] font-bold uppercase tracking-[0.5px] ${accentText}`}>
          {notification.eyebrow}
        </div>
        <p className="mt-1 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
          {renderLine(notification.line)}
        </p>
        {notification.description ? (
          <p className="mt-0.5 text-[0.75rem] text-[color:var(--text-secondary)]">
            {notification.description}
          </p>
        ) : null}
        {notification.url ? (
          <span
            className={`mt-2 inline-flex items-center gap-1 text-[0.75rem] font-semibold ${accentText}`}
          >
            {notification.cta ?? "Abrir"}
            <ArrowRight size={13} strokeWidth={2.25} aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
          {notification.triggeredAtLabel}
        </span>
        {unread ? (
          <span
            aria-label="Não lida"
            className="h-2 w-2 rounded-full bg-[color:var(--color-brand-500)]"
          />
        ) : null}
      </div>
    </>
  );

  const baseClass = `relative flex items-start gap-3 rounded-xl border p-4 transition-colors ${
    unread
      ? "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
      : "border-transparent bg-[color:var(--surface-1)]/50"
  }`;

  if (notification.url) {
    return (
      <Link
        href={notification.url as Route}
        className={`focus-ring ${baseClass} hover:border-[color:var(--color-brand-500)]/40`}
      >
        {inner}
      </Link>
    );
  }

  return <article className={baseClass}>{inner}</article>;
}
