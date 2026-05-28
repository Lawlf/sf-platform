import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import { captureGoalSnapshots } from "@/application/use-cases/goal/capture-goal-snapshots.use-case";
import { dispatchDebtDueNotifications } from "@/application/use-cases/push/dispatch-debt-due-notifications.use-case";
import { dispatchGoalReachedNotifications } from "@/application/use-cases/push/dispatch-goal-reached-notifications.use-case";
import { dispatchMonthlySummaryNotifications } from "@/application/use-cases/push/dispatch-monthly-summary-notifications.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleGoalSnapshotRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal-snapshot.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleNotificationPreferencesRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification-preferences.repository";
import { DrizzlePushSubscriptionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-push-subscription.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { getWebPushService } from "@/infrastructure/push/web-push.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron unificado de push notifications.
 * - Sempre: dispara debt due digest pra usuários Pro com dívidas ativas.
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

  return NextResponse.json({
    ok: true,
    debtDue: debtResult,
    monthlySummary: summaryResult,
    goalSnapshots: { snapshotsWritten: snapshotResult.snapshotsWritten },
    goalReached: goalReachedResult,
    triggeredAt: today.toISOString(),
  });
}
