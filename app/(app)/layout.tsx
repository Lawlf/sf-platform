import crypto from "node:crypto";


import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/app/components/ui/tooltip";
import { ensureDefaultWallet } from "@/application/use-cases/asset/ensure-default-wallet.use-case";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchMyHouseholds } from "./app/_actions/household-queries";
import { fetchUserProfiles } from "./app/_actions/profile-queries";
import { AppLockProvider } from "./app/_components/app-lock/app-lock-provider.client";
import { BottomNavGate } from "./app/_components/bottom-nav-gate";
import { CommandPalette } from "./app/_components/command-palette.client";
import { MobileTopBar } from "./app/_components/mobile-top-bar";
import { MoneyVisibilityProvider } from "./app/_components/money-visibility/money-visibility-provider.client";
import { OfflineBanner } from "./app/_components/offline-banner.client";
import { OfflineCacheWarmer } from "./app/_components/offline-cache-warmer.client";
import { OfflineNavGuard } from "./app/_components/offline-nav-guard.client";
import { InstallProvider } from "./app/_components/pwa/install-provider.client";
import { Sidebar } from "./app/_components/sidebar";
import { Topbar } from "./app/_components/topbar";
import { UsageHeartbeat } from "./app/_components/usage-heartbeat.client";
import { CopyProvider } from "./app/_lib/copy/provider.client";
import { fetchUnreadNotificationsCount } from "./app/notificacoes/_actions/list-notifications.action";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  if (user.onboardingWizardSeenAt === null) {
    redirect("/comecar");
  }

  const profileId = await getActiveProfileId();

  try {
    await ensureDefaultWallet(
      {
        assets: repos.assets,
        clock,
        newId: () => crypto.randomUUID(),
      },
      user.id,
      profileId,
    );
  } catch {
    // Best-effort: a criação da Carteira padrão não pode derrubar o app.
  }

  const displayName = user.displayName ?? user.email.split("@")[0] ?? user.email;
  const notificationCount = await fetchUnreadNotificationsCount();

  const credsRepo = repos.userCredentials;
  const [creds, passkeys, avatarUrl, profilesPayload, households] = await Promise.all([
    credsRepo.find(user.id),
    credsRepo.listWebauthn(user.id),
    repos.userAvatars.get(user.id),
    fetchUserProfiles(),
    fetchMyHouseholds(),
  ]);
  const appLockEnabled = creds?.appLockEnabled ?? false;
  const appLockTimeout = creds?.appLockTimeout ?? 60;
  const hasPasskey = passkeys.length > 0;
  const hasHousehold = households.length > 0;

  const activeIsPj =
    profilesPayload?.profiles.find((p) => p.id === profilesPayload.activeProfileId)?.type ===
    "PJ_MEI";

  const hideValues = (await cookies()).get("sf_hide_values")?.value === "1";

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={0}>
      <AppLockProvider enabled={appLockEnabled} timeoutSeconds={appLockTimeout} hasPasskey={hasPasskey}>
        <MoneyVisibilityProvider initialHidden={hideValues}>
          <InstallProvider isPro={user.isPro}>
          <CopyProvider value={activeIsPj ? "PJ_MEI" : "PF"}>
          <div className="relative min-h-screen pb-24 pt-[72px] md:pb-0 md:pl-[var(--sidebar-w)] md:pt-[56px] md:transition-[padding] md:duration-200">
            <div className="bg-blob-bottom-left hidden md:block" aria-hidden />
            <div className="bg-blob-mid" aria-hidden />
            <Sidebar
              displayName={displayName}
              avatarUrl={avatarUrl}
              isPro={user.isPro}
              profiles={profilesPayload?.profiles ?? []}
              activeProfileId={profilesPayload?.activeProfileId ?? profileId}
              hasHousehold={hasHousehold}
              notificationCount={notificationCount}
            />
            <Topbar />
            <MobileTopBar
              displayName={displayName}
              avatarUrl={avatarUrl}
              notificationCount={notificationCount}
              profiles={profilesPayload?.profiles ?? []}
              activeProfileId={profilesPayload?.activeProfileId ?? profileId}
            />

            <UsageHeartbeat />
            <CommandPalette />
            <OfflineNavGuard />
            <OfflineCacheWarmer />
            <OfflineBanner />
            {children}

            <div className="md:hidden">
              <BottomNavGate activeIsPj={activeIsPj} />
            </div>
          </div>
          </CopyProvider>
          </InstallProvider>
        </MoneyVisibilityProvider>
      </AppLockProvider>
    </TooltipProvider>
  );
}
