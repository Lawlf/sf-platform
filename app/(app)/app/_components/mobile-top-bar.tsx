"use client";

import { Bell, Settings } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { HideValuesToggle } from "./money-visibility/hide-values-toggle.client";
import { UserAvatar } from "./user-avatar";

export interface MobileTopBarProps {
  displayName: string;
  avatarUrl?: string | null | undefined;
  notificationCount?: number;
}

export function MobileTopBar({ displayName, avatarUrl, notificationCount = 0 }: MobileTopBarProps) {
  const hasNotifications = notificationCount > 0;
  const badgeLabel = notificationCount > 9 ? "9+" : String(notificationCount);

  return (
    <header
      aria-label="Barra superior"
      className="fixed inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between border-b border-[color:var(--border-soft)] bg-[color:var(--bg-app)]/85 px-3 backdrop-blur-md md:hidden"
    >
      <SimpleTooltip label="Ir para perfil" side="bottom">
        <Link
          href={"/app/perfil" as Route}
          aria-label="Ir para perfil"
          className="focus-ring flex items-center gap-2.5 rounded-full bg-[color:var(--color-brand-500)]/[0.12] py-2 pl-2 pr-5 text-[0.9375rem] font-semibold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.2]"
        >
          <UserAvatar
            dataUrl={avatarUrl}
            displayName={displayName}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[0.875rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.35)]"
          />
          <span className="max-w-[150px] truncate">{displayName}</span>
        </Link>
      </SimpleTooltip>

      <div className="flex items-center gap-2.5">
        <HideValuesToggle size={22} />
        <SimpleTooltip label="Notificações" side="bottom">
          <Link
            href={"/app/notificacoes" as Route}
            aria-label={
              hasNotifications ? `${notificationCount} notificações não lidas` : "Notificações"
            }
            className="focus-ring relative flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-1)] text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <Bell size={22} strokeWidth={1.75} aria-hidden />
            {hasNotifications ? (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--semantic-negative)] px-1 text-[0.5625rem] font-bold text-white shadow-[0_0_0_2px_var(--bg-app)]"
              >
                {badgeLabel}
              </span>
            ) : null}
          </Link>
        </SimpleTooltip>

        <SimpleTooltip label="Configurações" side="bottom">
          <Link
            href={"/app/configuracoes" as Route}
            aria-label="Configurações"
            className="focus-ring flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-1)] text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <Settings size={22} strokeWidth={1.75} aria-hidden />
          </Link>
        </SimpleTooltip>
      </div>
    </header>
  );
}
