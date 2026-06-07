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
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleExchangeRateRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-exchange-rate.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleMonthClosingRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-month-closing.repository";
import { DrizzlePlanRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-plan.repository";
import { DrizzleSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-subscription.repository";
import { DrizzleUsageRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-usage.repository";
import { DrizzleUserAchievementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-achievement.repository";
import { DrizzleUserAvatarRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-avatar.repository";
import { DrizzleUserFxOverrideRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-fx-override.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
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
  const avatarUrl = await new DrizzleUserAvatarRepository().get(user.id);
  const unlockedAchievements = await new DrizzleUserAchievementRepository().listForUser(user.id);

  const username = await ensureUsername({ users: new DrizzleUserRepository() }, { userId: user.id });
  const activeMonths = await new DrizzleUsageRepository().listActiveMonthIsos(user.id);
  const consistencyTier = tierFor(totalDistinctMonths(activeMonths));
  const identity = await getProfileIdentity(
    { subscriptions: new DrizzleSubscriptionRepository(), plans: new DrizzlePlanRepository() },
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
  const clock = new SystemClock();
  const debts = new DrizzleDebtRepository();
  const snapshotR = await getDashboardSnapshot(
    {
      debts,
      incomes: new DrizzleIncomeRepository(),
      clock,
      rates: new DrizzleExchangeRateRepository(),
      overrides: new DrizzleUserFxOverrideRepository(),
    },
    { userId },
  );
  const snapshot = isOk(snapshotR) ? snapshotR.value : null;

  const prescR = await buildPrescription(
    {
      debts,
      incomes: new DrizzleIncomeRepository(),
      assets: new DrizzleAssetRepository(),
      rates: new DrizzleExchangeRateRepository(),
      overrides: new DrizzleUserFxOverrideRepository(),
      clock,
      now: () => clock.now(),
    },
    { userId },
  );
  const prescriptionState = isOk(prescR) ? prescR.value.state : "incomplete";

  const consistency = await getConsistencyCard(
    {
      usage: new DrizzleUsageRepository(),
      closings: new DrizzleMonthClosingRepository(),
      now: () => clock.now(),
    },
    { userId, state: prescriptionState },
  );

  return (
    <PerfilStats
      incomeCommittedPct={snapshot ? snapshot.incomeCommittedPct : null}
      consistency={consistency}
    />
  );
}
