import { timingSafeEqual } from "node:crypto";


import { NextResponse } from "next/server";

import { dispatchInactivityEmail } from "@/application/use-cases/email/dispatch-inactivity-email.use-case";
import { dispatchMonthlyEmail } from "@/application/use-cases/email/dispatch-monthly-email.use-case";
import { dispatchUpsellEmail } from "@/application/use-cases/email/dispatch-upsell-email.use-case";
import { dispatchWinbackEmail } from "@/application/use-cases/email/dispatch-winback-email.use-case";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const appUrl = loadEnv().NEXT_PUBLIC_APP_URL;
  const email = new ResendEmailService();
  const users = repos.users;
  const userActivity = repos.userActivity;
  const preferences = repos.notificationPreferences;
  const emailSends = repos.emailSends;

  // Teto diário do lote de lifecycle, reservando cota pra auth/transacional
  // (Resend free = 300/dia, chave única). Sem isto, o lote do dia 1 pode estourar
  // a cota e deixar códigos de login sem enviar no pico.
  const capRaw = Number.parseInt(process.env.LIFECYCLE_DAILY_CAP ?? "200", 10);
  let budget = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : 200;

  const winback = await dispatchWinbackEmail({
    subscriptions: repos.subscriptions,
    users,
    preferences,
    emailSends,
    email,
    clock,
    appUrl,
    maxSends: budget,
  });
  budget -= winback.sent;

  const inactivity = await dispatchInactivityEmail({
    userActivity,
    preferences,
    emailSends,
    email,
    clock,
    appUrl,
    maxSends: budget,
  });
  budget -= inactivity.sent;

  const upsell = await dispatchUpsellEmail({
    userActivity,
    preferences,
    emailSends,
    email,
    clock,
    appUrl,
    maxSends: budget,
  });
  budget -= upsell.sent;

  let monthly = { sent: 0 };
  if (clock.now().getUTCDate() === 1) {
    monthly = await dispatchMonthlyEmail({
      userActivity,
      preferences,
      emailSends,
      email,
      clock,
      appUrl,
      maxSends: budget,
    });
  }

  return NextResponse.json({
    ok: true,
    winbackSent: winback.sent,
    inactivitySent: inactivity.sent,
    upsellSent: upsell.sent,
    monthlySent: monthly.sent,
  });
}
