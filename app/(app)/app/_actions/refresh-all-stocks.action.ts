"use server";

import { refreshAllUserStocks } from "@/application/use-cases/stocks/refresh-all-user-stocks.use-case";
import { timingSafeStringEqual } from "@/infrastructure/auth/timing-safe-compare";
import { loadEnv } from "@/infrastructure/config/env";
import { clock, repos } from "@/infrastructure/container";
import { BrapiQuoteAdapter } from "@/infrastructure/external/brapi/brapi-quote.adapter";

export type RefreshAllStocksResult =
  | { ok: true; tickers: number; updated: number; failed: number }
  | { ok: false; message: string };

/**
 * Server action chamada pelo cron diário para atualizar o catálogo de
 * cotações dos usuários Pro. Autenticada via `CRON_SECRET` para evitar
 * que qualquer requisição autenticada dispare a chamada paga à brapi.
 */
export async function refreshAllStocksAction(secret: string): Promise<RefreshAllStocksResult> {
  const env = loadEnv();
  const expected = env.CRON_SECRET;
  if (!expected || !timingSafeStringEqual(secret, expected)) {
    return { ok: false, message: "Unauthorized" };
  }
  try {
    const result = await refreshAllUserStocks({
      users: repos.users,
      assets: repos.assets,
      catalog: repos.stockCatalog,
      quotes: new BrapiQuoteAdapter(),
      clock,
    });
    return { ok: true, ...result };
  } catch {
    return { ok: false, message: "Falha ao atualizar cotacoes." };
  }
}
