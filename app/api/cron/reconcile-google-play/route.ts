import { reconcileGooglePlay } from "@/application/use-cases/billing/reconcile-google-play.use-case";
import { timingSafeStringEqual } from "@/infrastructure/auth/timing-safe-compare";
import { buildGooglePlayBillingAdapter } from "@/infrastructure/billing/google-play/google-play-billing.adapter";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return timingSafeStringEqual(token, cronSecret);
}

export async function GET(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const env = loadEnv();
  const result = await reconcileGooglePlay({
    subscriptions: repos.subscriptions,
    users: repos.users,
    email: new ResendEmailService(),
    clock,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    play: buildGooglePlayBillingAdapter(),
  });

  return Response.json({ ok: true, ...result });
}
