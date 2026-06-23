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
import { clock, repos } from "@/infrastructure/container";
import { resolvePfProfileId } from "@/presentation/http/middleware/active-profile";
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
    users: repos.users,
    debts: repos.debts,
    pushSubscriptions: repos.pushSubscriptions,
    preferences: repos.notificationPreferences,
    pushService: getWebPushService(),
    clock,
    resolveProfileId: resolvePfProfileId,
  };

  const debtResult = await dispatchDebtDueNotifications(deps);

  const today = new Date();
  const isFirstOfMonth = today.getUTCDate() === 1;

  let summaryResult = { pushesSent: 0 };
  let snapshotResult = { snapshotsWritten: 0, reached: [] as { goalId: string; userId: string; title: string }[] };
  let goalReachedResult = { pushesSent: 0 };

  if (isFirstOfMonth) {
    const getMonthlyFreeCashFlow = async (userId: string) => {
      const profileId = await resolvePfProfileId(userId);
      const r = await getDashboardSnapshot(
        {
          debts: repos.debts,
          incomes: repos.incomes,
          clock,
          rates: repos.exchangeRates,
          overrides: repos.userFxOverrides,
        },
        { userId, profileId },
      );
      if (!isOk(r)) return null;
      const m = r.value.monthlyFreeCashFlow;
      return { cents: m.toCents(), formatted: m.format() };
    };
    summaryResult = await dispatchMonthlySummaryNotifications({ ...deps, getMonthlyFreeCashFlow });

    const assets = repos.assets;
    const allocations = repos.assetDebtAllocations;
    const debts = repos.debts;
    const incomes = repos.incomes;
    const rates = repos.exchangeRates;
    const overrides = repos.userFxOverrides;

    snapshotResult = await captureGoalSnapshots(
      {
        goals: repos.goals,
        snapshots: repos.goalSnapshots,
        buildMacro: async (userId) => {
          const profileId = await resolvePfProfileId(userId);
          return buildGoalMacro(
            { assets, allocations, debts, incomes, clock, rates, overrides },
            { userId, profileId },
          );
        },
      },
      { now: today },
    );

    goalReachedResult = await dispatchGoalReachedNotifications(deps, snapshotResult.reached);
  }

  const evaluateSustained = async (userId: string): Promise<SustainedEvaluation> => {
    const profileId = await resolvePfProfileId(userId);
    const debtsRepo = repos.debts;
    const snapshotR = await getDashboardSnapshot(
      {
        debts: debtsRepo,
        incomes: repos.incomes,
        clock,
        rates: repos.exchangeRates,
        overrides: repos.userFxOverrides,
      },
      { userId, profileId },
    );
    const netWorthR = await getNetWorth(
      {
        assets: repos.assets,
        allocations: repos.assetDebtAllocations,
        debts: debtsRepo,
        rates: repos.exchangeRates,
        overrides: repos.userFxOverrides,
        clock,
      },
      { userId, profileId },
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
    const profileId = await resolvePfProfileId(userId);
    const userDebts = await repos.debts.listForProfile(profileId, { status: "all" });
    const [userAssets, userIncomes, userGoals] = await Promise.all([
      repos.assets.findActiveByProfile(profileId),
      repos.incomes.listForProfile(profileId),
      repos.goals.listForProfile(profileId),
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

  const usage = repos.usage;
  const achievementsResult = await runAchievementsRecompute(
    {
      listRecentlyActiveUserIds: (now, days) => usage.listRecentlyActiveUserIds(now, days),
      listActiveMonthIsos: (userId) => usage.listActiveMonthIsos(userId),
      progress: repos.achievementProgress,
      clock,
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
