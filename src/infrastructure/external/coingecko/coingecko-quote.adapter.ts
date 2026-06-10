import type {
  CryptoPriceById,
  CryptoQuoteAdapter,
  CryptoQuoteResult,
} from "@/domain/ports/external/crypto-quote-adapter.port";

import { coinIdForSymbol } from "./coingecko-coin-ids";

const BASE_URL = "https://api.coingecko.com/api/v3";
const TIMEOUT_MS = 8000;
const MAX_IDS_PER_CALL = 250;

export interface CoinGeckoQuoteAdapterOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

type CoinGeckoPriceResponse = Record<string, { brl?: number } | undefined>;

export class CoinGeckoQuoteAdapter implements CryptoQuoteAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CoinGeckoQuoteAdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.COINGECKO_API_URL ?? BASE_URL;
    this.timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async fetchPriceMap(
    coinIds: string[],
  ): Promise<{ map: Map<string, bigint>; fetchedAt: Date } | null> {
    const ids = Array.from(
      new Set(
        coinIds
          .map((c) => (typeof c === "string" ? c : "").trim().toLowerCase())
          .filter((c) => c.length > 0),
      ),
    );
    const fetchedAt = new Date();
    if (ids.length === 0) return { map: new Map(), fetchedAt };

    const map = new Map<string, bigint>();
    let anyOk = false;
    for (let i = 0; i < ids.length; i += MAX_IDS_PER_CALL) {
      const batch = ids.slice(i, i + MAX_IDS_PER_CALL);
      const url = `${this.baseUrl}/simple/price?ids=${batch.map(encodeURIComponent).join(",")}&vs_currencies=brl`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(url, { signal: controller.signal });
        if (!response.ok) continue;
        anyOk = true;
        const data = (await response.json()) as CoinGeckoPriceResponse;
        for (const id of batch) {
          const entry = data[id];
          if (
            !entry ||
            typeof entry.brl !== "number" ||
            !Number.isFinite(entry.brl) ||
            entry.brl <= 0
          )
            continue;
          map.set(id, BigInt(Math.round(entry.brl * 100)));
        }
      } catch {
        // lote falhou (timeout/rede); segue pros demais.
      } finally {
        clearTimeout(timer);
      }
    }
    return anyOk ? { map, fetchedAt } : null;
  }

  async fetchByIds(coinIds: string[]): Promise<CryptoPriceById[]> {
    if (!Array.isArray(coinIds) || coinIds.length === 0) return [];
    const result = await this.fetchPriceMap(coinIds);
    if (!result) return [];
    const out: CryptoPriceById[] = [];
    for (const [coinId, priceCents] of result.map) {
      out.push({ coinId, priceCents, fetchedAt: result.fetchedAt });
    }
    return out;
  }

  async fetchQuotes(symbols: string[]): Promise<CryptoQuoteResult[]> {
    if (!Array.isArray(symbols) || symbols.length === 0) return [];
    const pairs = symbols
      .map((s) => ({ symbol: (typeof s === "string" ? s : "").trim().toUpperCase() }))
      .filter((p) => p.symbol.length > 0)
      .map((p) => ({ symbol: p.symbol, coinId: coinIdForSymbol(p.symbol) }))
      .filter((p): p is { symbol: string; coinId: string } => p.coinId !== null);
    if (pairs.length === 0) return [];

    const result = await this.fetchPriceMap(pairs.map((p) => p.coinId));
    if (!result) return [];
    const out: CryptoQuoteResult[] = [];
    for (const p of pairs) {
      const priceCents = result.map.get(p.coinId);
      if (priceCents === undefined) continue;
      out.push({ symbol: p.symbol, coinId: p.coinId, priceCents, fetchedAt: result.fetchedAt });
    }
    return out;
  }
}
