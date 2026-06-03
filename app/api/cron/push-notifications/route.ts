import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { awardEventAchievement } from "@/app/(app)/app/_actions/_achievements";
import type { SustainedEvaluation } from "@/application/use-cases/achievement/recompute-derived-achievements.use-case";
import { reconcileEventAchievements } from "@/application/use-cases/achievement/reconcile-event-achievements.use-case";
import { runAchievementsRecompute } from "@/application/use-cases/achievement/run-achievements-recompute.use-case";
import { getNetWorth } from "@/application/use-cases/asset/get-net-worth.use-case";
import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import { captureGoalSnapshots } from "@/application/use-cases/goal/capture-goal-snapshots.use-case";
import { dispatchDebtDueNotifications } from "@/application/use-cases/push/dispatch-debt-due-notifications.use-case";
import { dispatchGoalReachedNotifications } from "@/application/use-cases/push/dispatch-goal-reached-notifications.use-case";
import { dispatchMonthlySummaryNotifications } from "@/application/use-cases/push/dispatch-monthly-summary-notifications.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAchievementProgressRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-achievement-progress.repository";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleGoalSnapshotRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal-snapshot.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleNotificationPreferencesRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification-preferences.repository";
import { DrizzlePushSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-push-subscription.repository";
import { DrizzleUsageRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-usage.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { getWebPushService } from "@/infrastructure/push/web-push.service";
import { isOk } from "@/shared/errors/result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron unificado de push notifications.
 * - Sempre: avisa Pro sobre parcelas a vencer dentro da antecedência escolhida.
 * - Dia 1 do mês: dispara resumo mensal.
 *
 * Vercel Cron chama com `Authorization: Bearer $CRON_SECRET`.
 */
function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET not configured");
    return false;
  }
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const deps = {
    users: new DrizzleUserRepository(),
    debts: new DrizzleDebtRepository(),
    pushSubscriptions: new DrizzlePushSubscriptionRepository(),
    preferences: new DrizzleNotificationPreferencesRepository(),
    pushService: getWebPushService(),
    clock: new SystemClock(),
  };

  const debtResult = await dispatchDebtDueNotifications(deps);

  const today = new Date();
  const isFirstOfMonth = today.getUTCDate() === 1;

  let summaryResult = { pushesSent: 0 };
  let snapshotResult = { snapshotsWritten: 0, reached: [] as { goalId: string; userId: string; title: string }[] };
  let goalReachedResult = { pushesSent: 0 };

  if (isFirstOfMonth) {
    summaryResult = await dispatchMonthlySummaryNotifications(deps);

    const assets = new DrizzleAssetRepository();
    const allocations = new DrizzleAssetDebtAllocationRepository();
    const debts = new DrizzleDebtRepository();
    const incomes = new DrizzleIncomeRepository();
    const clock = new SystemClock();

    snapshotResult = await captureGoalSnapshots(
      {
        goals: new DrizzleGoalRepository(),
        snapshots: new DrizzleGoalSnapshotRepository(),
        buildMacro: (userId) =>
          buildGoalMacro({ assets, allocations, debts, incomes, clock }, { userId }),
      },
      { now: today },
    );

    goalReachedResult = await dispatchGoalReachedNotifications(deps, snapshotResult.reached);
  }

  const evaluateSustained = async (userId: string): Promise<SustainedEvaluation> => {
    const clock = new SystemClock();
    const debtsRepo = new DrizzleDebtRepository();
    const snapshotR = await getDashboardSnapshot(
      { debts: debtsRepo, incomes: new DrizzleIncomeRepository(), clock },
      { userId },
    );
    const netWorthR = await getNetWorth(
      {
        assets: new DrizzleAssetRepository(),
        allocations: new DrizzleAssetDebtAllocationRepository(),
        debts: debtsRepo,
      },
      { userId },
    );
    const committedPct = isOk(snapshotR) ? snapshotR.value.incomeCommittedPct : null;
    const netWorthCents = isOk(netWorthR) ? netWorthR.value.netWorth.toCents() : 0n;
    return {
      saudeVerde: committedPct != null && committedPct < 30,
      patrimonioPositivo: netWorthCents > 0n,
      monthActive: true,
    };
  };

  const reconcileEvents = async (userId: string): Promise<void> => {
    const userDebts = await new DrizzleDebtRepository().listForUser(userId, { status: "all" });
    const [userAssets, userIncomes, userGoals] = await Promise.all([
      new DrizzleAssetRepository().findActiveByUser(userId),
      new DrizzleIncomeRepository().listForUser(userId),
      new DrizzleGoalRepository().listForUser(userId),
    ]);
    await reconcileEventAchievements(
      (uid, slug) => awardEventAchievement(uid, slug),
      {
        hasDebt: userDebts.length > 0,
        hasAsset: userAssets.length > 0,
        hasIncome: userIncomes.length > 0,
        hasGoal: userGoals.length > 0,
        hasPaidOffDebt: userDebts.some((d) => d.status === "paid_off"),
      },
      userId,
    );
  };

  const usage = new DrizzleUsageRepository();
  const achievementsResult = await runAchievementsRecompute(
    {
      listRecentlyActiveUserIds: (now, days) => usage.listRecentlyActiveUserIds(now, days),
      listActiveMonthIsos: (userId) => usage.listActiveMonthIsos(userId),
      progress: new DrizzleAchievementProgressRepository(),
      clock: new SystemClock(),
      award: (userId, slug) => awardEventAchievement(userId, slug),
      evaluate: evaluateSustained,
      reconcileEvents,
    },
    today,
  );

  return NextResponse.json({
    ok: true,
    debtDue: debtResult,
    monthlySummary: summaryResult,
    goalSnapshots: { snapshotsWritten: snapshotResult.snapshotsWritten },
    goalReached: goalReachedResult,
    achievements: achievementsResult,
    triggeredAt: today.toISOString(),
  });
}
