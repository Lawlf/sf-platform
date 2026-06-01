import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/app/components/ui/tooltip";
import { DrizzleUserCredentialsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-credentials.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { AppLockProvider } from "./app/_components/app-lock/app-lock-provider.client";
import { BottomNavGate } from "./app/_components/bottom-nav-gate";
import { MobileTopBar } from "./app/_components/mobile-top-bar";
import { MoneyVisibilityProvider } from "./app/_components/money-visibility/money-visibility-provider.client";
import { Sidebar } from "./app/_components/sidebar";
import { Topbar } from "./app/_components/topbar";
import { UsageHeartbeat } from "./app/_components/usage-heartbeat.client";
import { fetchUndismissedNotificationsCount } from "./app/notificacoes/_actions/list-notifications.action";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  if (user.onboardingWizardSeenAt === null) {
    redirect("/comecar");
  }

  const displayName = user.displayName ?? user.email.split("@")[0] ?? user.email;
  const notificationCount = await fetchUndismissedNotificationsCount();

  const credsRepo = new DrizzleUserCredentialsRepository();
  const [creds, passkeys] = await Promise.all([credsRepo.find(user.id), credsRepo.listWebauthn(user.id)]);
  const appLockEnabled = creds?.appLockEnabled ?? false;
  const appLockTimeout = creds?.appLockTimeout ?? 60;
  const hasPasskey = passkeys.length > 0;

  const hideValues = (await cookies()).get("sf_hide_values")?.value === "1";

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <AppLockProvider enabled={appLockEnabled} timeoutSeconds={appLockTimeout} hasPasskey={hasPasskey}>
        <MoneyVisibilityProvider initialHidden={hideValues}>
          <div className="relative min-h-screen pb-24 pt-[72px] md:pb-0 md:pl-[var(--sidebar-w)] md:pt-[56px] md:transition-[padding] md:duration-200">
            <div className="bg-blob-bottom-left hidden md:block" aria-hidden />
            <div className="bg-blob-mid" aria-hidden />
            <Sidebar />
            <Topbar
              displayName={displayName}
              email={user.email}
              notificationCount={notificationCount}
            />
            <MobileTopBar displayName={displayName} notificationCount={notificationCount} />

            <UsageHeartbeat />
            {children}

            <div className="md:hidden">
              <BottomNavGate />
            </div>
          </div>
        </MoneyVisibilityProvider>
      </AppLockProvider>
    </TooltipProvider>
  );
}
