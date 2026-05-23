import type { Metadata } from "next";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/app/components/ui/tooltip";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

import { BottomNavGate } from "./app/_components/bottom-nav-gate";
import { MobileTopBar } from "./app/_components/mobile-top-bar";
import { Sidebar } from "./app/_components/sidebar";
import { Topbar } from "./app/_components/topbar";
import { fetchUndismissedNotificationsCount } from "./app/notificacoes/_actions/list-notifications.action";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const displayName = user.displayName ?? user.email.split("@")[0] ?? user.email;
  const notificationCount = await fetchUndismissedNotificationsCount();

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <div className="relative min-h-screen pb-24 pt-[58px] md:pb-0 md:pl-[var(--sidebar-w)] md:pt-[56px] md:transition-[padding] md:duration-200">
        <div className="bg-blob-bottom-left hidden md:block" aria-hidden />
        <div className="bg-blob-mid" aria-hidden />
        <Sidebar />
        <Topbar
          displayName={displayName}
          email={user.email}
          notificationCount={notificationCount}
        />
        <MobileTopBar displayName={displayName} notificationCount={notificationCount} />

        {children}

        <div className="md:hidden">
          <BottomNavGate />
        </div>
      </div>
    </TooltipProvider>
  );
}
