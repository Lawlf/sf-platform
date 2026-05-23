import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { dispatchDebtDueNotifications } from "@/application/use-cases/push/dispatch-debt-due-notifications.use-case";
import { dispatchMonthlySummaryNotifications } from "@/application/use-cases/push/dispatch-monthly-summary-notifications.use-case";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
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
  const isFirstOfMonth = today.getDate() === 1;
  const summaryResult = isFirstOfMonth
    ? await dispatchMonthlySummaryNotifications(deps)
    : { pushesSent: 0 };

  return NextResponse.json({
    ok: true,
    debtDue: debtResult,
    monthlySummary: summaryResult,
    triggeredAt: today.toISOString(),
  });
}
