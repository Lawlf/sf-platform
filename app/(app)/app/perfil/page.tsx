import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { getConsistencyCard } from "@/application/use-cases/achievement/get-consistency-card.use-case";
import { totalDistinctMonths } from "@/application/use-cases/achievement/streak-math";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { buildPrescription } from "@/application/use-cases/prescription/build-prescription.use-case";
import { ensureUsername } from "@/application/use-cases/profile/ensure-username.use-case";
import { getProfileIdentity } from "@/application/use-cases/profile/get-profile-identity.use-case";
import { tierFor } from "@/domain/services/consistency.service";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../_components/page-shell";

import { AdminPanelButton } from "./_components/admin-panel-button.client";
import { FlairPicker } from "./_components/flair-picker.client";
import { PerfilAchievements } from "./_components/perfil-achievements";
import { PerfilHero } from "./_components/perfil-hero";
import { PerfilStats } from "./_components/perfil-stats";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ stepup?: string }>;
}) {
  const user = await requireUser();
  const { stepup } = await searchParams;
  const avatarUrl = await repos.userAvatars.get(user.id);
  const unlockedAchievements = await repos.userAchievements.listForUser(user.id);

  const username = await ensureUsername({ users: repos.users }, { userId: user.id });
  const activeMonths = await repos.usage.listActiveMonthIsos(user.id);
  const consistencyTier = tierFor(totalDistinctMonths(activeMonths));
  const identity = await getProfileIdentity(
    { subscriptions: repos.subscriptions, plans: repos.plans },
    {
      userId: user.id,
      isPro: user.isPro,
      isAdmin: user.role === "admin",
      flair: user.profileFlair,
      consistencyTier,
    },
  );

  return (
    <PageShell title="Perfil" description="Quem você é, como anda sua saúde financeira.">
      <PerfilHero
        initialDisplayName={user.displayName ?? ""}
        initialAvatarUrl={avatarUrl}
        username={username}
        supporterTier={identity.supporterTier}
        badges={identity.badges}
        memberSince={user.createdAt.getUTCFullYear()}
      />
      {user.profileFlair === null ? <FlairPicker initialFlair={user.profileFlair} /> : null}
      {user.role === "admin" ? <AdminPanelButton autoOpen={stepup === "admin"} /> : null}
      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-[100px] rounded-2xl" />
            <Skeleton className="h-[100px] rounded-2xl" />
            <Skeleton className="h-[100px] rounded-2xl" />
          </div>
        }
      >
        <PerfilStatsSection userId={user.id} />
      </Suspense>
      <PerfilAchievements unlocked={unlockedAchievements} />
    </PageShell>
  );
}

async function PerfilStatsSection({ userId }: { userId: string }) {
  const profileId = await getActiveProfileId();
  const debts = repos.debts;
  const snapshotR = await getDashboardSnapshot(
    {
      debts,
      incomes: repos.incomes,
      clock,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
    },
    { userId, profileId },
  );
  const snapshot = isOk(snapshotR) ? snapshotR.value : null;

  const prescR = await buildPrescription(
    {
      debts,
      incomes: repos.incomes,
      assets: repos.assets,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
      clock,
      now: () => clock.now(),
    },
    { userId, profileId },
  );
  const prescriptionState = isOk(prescR) ? prescR.value.state : "incomplete";

  const consistency = await getConsistencyCard(
    {
      usage: repos.usage,
      closings: repos.monthClosings,
      now: () => clock.now(),
    },
    { userId, profileId, state: prescriptionState },
  );

  return (
    <PerfilStats
      incomeCommittedPct={snapshot ? snapshot.incomeCommittedPct : null}
      consistency={consistency}
    />
  );
}
