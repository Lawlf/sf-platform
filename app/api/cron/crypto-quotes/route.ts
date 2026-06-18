import { refreshAllUserCrypto } from "@/application/use-cases/crypto/refresh-all-user-crypto.use-case";
import { timingSafeStringEqual } from "@/infrastructure/auth/timing-safe-compare";
import { clock, repos } from "@/infrastructure/container";
import { CoinGeckoQuoteAdapter } from "@/infrastructure/external/coingecko/coingecko-quote.adapter";

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

  const result = await refreshAllUserCrypto({
    users: repos.users,
    profiles: repos.profiles,
    assets: repos.assets,
    quotes: new CoinGeckoQuoteAdapter(),
    catalog: repos.cryptoPriceCatalog,
    clock,
  });

  return Response.json({ ok: true, ...result });
}
