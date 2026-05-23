"use server";

import { DrizzleStockCatalogRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-stock-catalog.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export interface StockCatalogSearchResult {
  ticker: string;
  companyName: string | null;
  lastPriceCents: string | null;
}

/**
 * Server action used by the asset wizard ticker combobox.
 * Returns up to 10 matches from the local stock catalog.
 *
 * LGPD: requireUser garante que apenas sessões autenticadas
 * consigam consultar o catálogo, mesmo ele sendo público entre
 * usuários (não há dado pessoal no retorno).
 */
export async function searchStockCatalogAction(query: string): Promise<StockCatalogSearchResult[]> {
  await requireUser();
  const trimmed = (query ?? "").trim();
  if (trimmed.length < 1) return [];
  const repo = new DrizzleStockCatalogRepository();
  const results = await repo.search(trimmed, 10);
  return results.map((r) => ({
    ticker: r.ticker,
    companyName: r.companyName,
    lastPriceCents: r.lastPriceCents !== null ? r.lastPriceCents.toString() : null,
  }));
}
