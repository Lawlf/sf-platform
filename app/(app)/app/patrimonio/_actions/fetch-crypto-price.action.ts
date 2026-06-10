"use server";

import { clock, repos } from "@/infrastructure/container";
import { CoinGeckoQuoteAdapter } from "@/infrastructure/external/coingecko/coingecko-quote.adapter";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function fetchCryptoPriceAction(
  coinId: string,
): Promise<{ priceCents: string } | null> {
  const id = coinId.trim().toLowerCase();
  if (id.length === 0) return null;

  const now = clock.now();
  // catálogo é cache; ausente até migration aplicar, então segue direto na fonte.
  let cached: Awaited<ReturnType<typeof repos.cryptoPriceCatalog.findByCoinId>> = null;
  try {
    cached = await repos.cryptoPriceCatalog.findByCoinId(id);
  } catch {
    cached = null;
  }
  if (
    cached?.lastPriceCents != null &&
    cached.lastFetchedAt != null &&
    now.getTime() - cached.lastFetchedAt.getTime() < MAX_AGE_MS
  ) {
    return { priceCents: cached.lastPriceCents.toString() };
  }

  const prices = await new CoinGeckoQuoteAdapter().fetchByIds([id]);
  const price = prices[0];
  if (!price) {
    return cached?.lastPriceCents != null ? { priceCents: cached.lastPriceCents.toString() } : null;
  }
  try {
    await repos.cryptoPriceCatalog.upsertMany([
      { coinId: id, lastPriceCents: price.priceCents, lastFetchedAt: price.fetchedAt },
    ]);
  } catch {
    // catálogo indisponível; preço já vai no retorno.
  }
  return { priceCents: price.priceCents.toString() };
}
