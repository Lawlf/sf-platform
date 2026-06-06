import { timingSafeStringEqual } from "@/infrastructure/auth/timing-safe-compare";
import { AwesomeApiFxClient } from "@/infrastructure/external/awesomeapi/awesomeapi-fx.client";
import { DrizzleExchangeRateRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-exchange-rate.repository";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { refreshExchangeRates } from "@/application/use-cases/fx/refresh-exchange-rates.use-case";

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

  const result = await refreshExchangeRates({
    client: new AwesomeApiFxClient(),
    rates: new DrizzleExchangeRateRepository(),
    clock: new SystemClock(),
  });

  return Response.json({ ok: true, ...result });
}
