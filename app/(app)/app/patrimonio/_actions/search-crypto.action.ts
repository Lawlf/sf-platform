"use server";

export interface CryptoSearchResult {
  id: string;
  symbol: string;
  name: string;
}

const BASE_URL = "https://api.coingecko.com/api/v3";
const TIMEOUT_MS = 8000;
const MAX_RESULTS = 8;

interface CoinGeckoSearchCoin {
  id?: string;
  symbol?: string;
  name?: string;
}

export async function searchCryptoAction(query: string): Promise<CryptoSearchResult[]> {
  const q = query.trim();
  if (q.length === 0) return [];

  const base = process.env.COINGECKO_API_URL ?? BASE_URL;
  const url = `${base}/search?query=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { coins?: CoinGeckoSearchCoin[] };
    const coins = Array.isArray(data.coins) ? data.coins : [];
    const out: CryptoSearchResult[] = [];
    for (const c of coins) {
      const id = typeof c.id === "string" ? c.id : "";
      const symbol = typeof c.symbol === "string" ? c.symbol.toUpperCase() : "";
      const name = typeof c.name === "string" ? c.name : "";
      if (id.length > 0 && symbol.length > 0) out.push({ id, symbol, name });
      if (out.length >= MAX_RESULTS) break;
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
