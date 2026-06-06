import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/app/components/ui/skeleton";
import { getNetWorth } from "@/application/use-cases/asset/get-net-worth.use-case";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleExchangeRateRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-exchange-rate.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleUserAchievementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-achievement.repository";
import { DrizzleUserAvatarRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-avatar.repository";
import { DrizzleUserFxOverrideRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-fx-override.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../_components/page-shell";

import { AdminPanelButton } from "./_components/admin-panel-button.client";
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

  return (
    <PageShell title="Perfil" description="Quem você é, como anda sua saúde financeira.">
      <PerfilHero
        initialDisplayName={user.displayName ?? ""}
        initialAvatarUrl={avatarUrl}
        email={user.email}
      />
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
  const netWorthR = await getNetWorth(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts,
      rates: new DrizzleExchangeRateRepository(),
      overrides: new DrizzleUserFxOverrideRepository(),
      clock,
    },
    { userId },
  );
  const snapshot = isOk(snapshotR) ? snapshotR.value : null;
  const netWorth = isOk(netWorthR) ? netWorthR.value : null;
  const totalAssetCount = netWorth
    ? netWorth.byCategory.reduce((acc, c) => acc + c.assetCount, 0)
    : 0;

  return (
    <PerfilStats
      netWorthFormatted={netWorth ? netWorth.netWorth.format() : null}
      netWorthIsNegative={netWorth ? netWorth.netWorth.toCents() < 0n : false}
      incomeCommittedPct={snapshot ? snapshot.incomeCommittedPct : null}
      assetCount={totalAssetCount}
    />
  );
}
