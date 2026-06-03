import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/app/components/ui/tooltip";
import { DrizzleUserAvatarRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-avatar.repository";
import { DrizzleUserCredentialsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-credentials.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { AppLockProvider } from "./app/_components/app-lock/app-lock-provider.client";
import { BottomNavGate } from "./app/_components/bottom-nav-gate";
import { CommandPalette } from "./app/_components/command-palette.client";
import { MobileTopBar } from "./app/_components/mobile-top-bar";
import { MoneyVisibilityProvider } from "./app/_components/money-visibility/money-visibility-provider.client";
import { Sidebar } from "./app/_components/sidebar";
import { Topbar } from "./app/_components/topbar";
import { UsageHeartbeat } from "./app/_components/usage-heartbeat.client";
import { fetchUnreadNotificationsCount } from "./app/notificacoes/_actions/list-notifications.action";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  if (user.onboardingWizardSeenAt === null) {
    redirect("/comecar");
  }

  const displayName = user.displayName ?? user.email.split("@")[0] ?? user.email;
  const notificationCount = await fetchUnreadNotificationsCount();

  const credsRepo = new DrizzleUserCredentialsRepository();
  const [creds, passkeys, avatarUrl] = await Promise.all([
    credsRepo.find(user.id),
    credsRepo.listWebauthn(user.id),
    new DrizzleUserAvatarRepository().get(user.id),
  ]);
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
            <Sidebar displayName={displayName} avatarUrl={avatarUrl} isPro={user.isPro} />
            <Topbar notificationCount={notificationCount} />
            <MobileTopBar
              displayName={displayName}
              avatarUrl={avatarUrl}
              notificationCount={notificationCount}
            />

            <UsageHeartbeat />
            <CommandPalette />
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
