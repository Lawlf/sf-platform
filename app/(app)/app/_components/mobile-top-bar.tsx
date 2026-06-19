"use client";

import { Bell, ChevronDown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRef, useState } from "react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import type { SerializedProfile } from "../_actions/profile-queries";

import { MobileAccountDrawer } from "./mobile-account-drawer.client";
import { HideValuesToggle } from "./money-visibility/hide-values-toggle.client";
import { UserAvatar } from "./user-avatar";

const LONG_PRESS_MS = 450;

export interface MobileTopBarProps {
  displayName: string;
  avatarUrl?: string | null | undefined;
  notificationCount?: number;
  profiles?: SerializedProfile[];
  activeProfileId?: string;
}

export function MobileTopBar({ displayName, avatarUrl, notificationCount = 0, profiles = [], activeProfileId }: MobileTopBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const longPressFired = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const multiProfile = profiles.length > 1;
  const badge = activeProfile ? (activeProfile.type === "PJ_MEI" ? "PJ" : "PF") : null;
  const hasNotifications = notificationCount > 0;
  const notificationLabel = notificationCount > 99 ? "99+" : String(notificationCount);

  function startPress() {
    longPressFired.current = false;
    timer.current = setTimeout(() => {
      longPressFired.current = true;
      setDrawerOpen(true);
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  return (
    <header
      aria-label="Barra superior"
      className="fixed inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between border-b border-[color:var(--border-soft)] bg-[color:var(--bg-app)]/85 px-3 backdrop-blur-md md:hidden"
    >
      <div className="flex items-center">
        <SimpleTooltip label="Ir para perfil" side="bottom">
          <Link
            href={"/app/perfil" as Route}
            aria-label="Ir para perfil"
            onPointerDown={startPress}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => {
              if (longPressFired.current) {
                e.preventDefault();
                longPressFired.current = false;
              }
            }}
            className="focus-ring flex select-none items-center gap-2 rounded-full bg-[color:var(--color-brand-500)]/[0.12] py-2 pl-2 pr-2.5 text-[color:var(--color-brand-800)] transition-colors [-webkit-touch-callout:none] hover:bg-[color:var(--color-brand-500)]/[0.2]"
          >
            <UserAvatar
              dataUrl={avatarUrl}
              displayName={displayName}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[0.875rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.35)]"
            />
            {multiProfile && badge ? (
              <span className="flex-none rounded bg-[color:var(--color-brand-500)]/[0.16] px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
                {badge}
              </span>
            ) : null}
          </Link>
        </SimpleTooltip>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-haspopup="dialog"
          aria-label="Trocar perfil e configurações"
          className="focus-ring -ml-1 flex h-10 w-7 items-center justify-center rounded-full text-[color:var(--color-brand-800)]/70 transition-colors hover:text-[color:var(--color-brand-800)]"
        >
          <ChevronDown size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <HideValuesToggle size={22} />
        <SimpleTooltip label="Notificações" side="bottom">
          <Link
            href={"/app/notificacoes" as Route}
            aria-label={hasNotifications ? `${notificationCount} notificações não lidas` : "Notificações"}
            className="focus-ring relative flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-1)] text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <Bell size={22} strokeWidth={1.75} aria-hidden />
            {hasNotifications ? (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--semantic-negative)] px-1 text-[0.5625rem] font-bold text-white shadow-[0_0_0_2px_var(--bg-app)]"
              >
                {notificationLabel}
              </span>
            ) : null}
          </Link>
        </SimpleTooltip>
      </div>

      <MobileAccountDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        displayName={displayName}
        avatarUrl={avatarUrl}
        profiles={profiles}
        activeProfileId={activeProfileId}
      />
    </header>
  );
}
