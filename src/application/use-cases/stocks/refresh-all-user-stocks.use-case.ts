import type { Clock } from "@/domain/ports/clock.port";
import type { QuoteAdapter } from "@/domain/ports/external/quote-adapter.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { StockCatalogRepositoryPort } from "@/domain/ports/repositories/stock-catalog.repository";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";

import { refreshStockCatalog } from "./refresh-stock-catalog.use-case";

export interface RefreshAllUserStocksDeps {
  users: UserRepositoryPort;
  profiles: Pick<ProfileRepositoryPort, "ensurePfProfile">;
  assets: AssetRepositoryPort;
  catalog: StockCatalogRepositoryPort;
  quotes: QuoteAdapter;
  clock: Clock;
}

export interface RefreshAllUserStocksResult {
  /**
   * Total de tickers únicos coletados de usuários Pro ativos.
   */
  tickers: number;
  updated: number;
  failed: number;
}

/**
 * Entrada principal do cron diário. Para cada usuário Pro ativo, coleta os
 * tickers das ações ativas, deduplica entre toda a base (1 cotação serve N
 * usuários) e dispara o refresh em lote do catálogo local.
 *
 * Apenas usuários Pro são considerados porque cada request à brapi.dev tem
 * custo. Usuários Free continuam podendo atualizar uma cotação individual
 * via UI, batendo direto na API.
 */
export async function refreshAllUserStocks(
  deps: RefreshAllUserStocksDeps,
): Promise<RefreshAllUserStocksResult> {
  const proUsers = await deps.users.findAllPro();
  if (proUsers.length === 0) {
    return { tickers: 0, updated: 0, failed: 0 };
  }

  const tickerSet = new Set<string>();
  for (const user of proUsers) {
    const profile = await deps.profiles.ensurePfProfile(user.id, deps.clock.now());
    const tickers = await deps.assets.listStockTickersForProfile(profile.id);
    for (const t of tickers) {
      const normalized = t.trim().toUpperCase();
      if (normalized.length > 0) tickerSet.add(normalized);
    }
  }

  const uniqueTickers = Array.from(tickerSet).sort();
  if (uniqueTickers.length === 0) {
    return { tickers: 0, updated: 0, failed: 0 };
  }

  const result = await refreshStockCatalog(
    { catalog: deps.catalog, quotes: deps.quotes, clock: deps.clock },
    { tickers: uniqueTickers },
  );

  return {
    tickers: uniqueTickers.length,
    updated: result.updated,
    failed: result.failed,
  };
}
