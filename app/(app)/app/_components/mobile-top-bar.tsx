"use client";

import { Bell } from "lucide-react";
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
          className="focus-ring flex select-none items-center rounded-full transition-opacity [-webkit-touch-callout:none] active:opacity-80"
        >
          <UserAvatar
            dataUrl={avatarUrl}
            displayName={displayName}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[0.9375rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.35)]"
          />
        </Link>
      </SimpleTooltip>

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
