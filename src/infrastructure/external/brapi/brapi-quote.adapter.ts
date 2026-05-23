import type {
  ListAvailableStocksOptions,
  QuoteAdapter,
  StockListEntry,
  StockQuoteResult,
} from "@/domain/ports/external/quote-adapter.port";

const BASE_URL = "https://brapi.dev/api/quote";
const LIST_URL = "https://brapi.dev/api/quote/list";
const TIMEOUT_MS = 8000;
const MAX_BATCH = 10;

export interface BrapiQuoteAdapterOptions {
  token?: string;
  baseUrl?: string;
  listUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface BrapiQuoteResult {
  symbol?: string;
  regularMarketPrice?: number;
  currency?: string;
  longName?: string | null;
  shortName?: string | null;
}

interface BrapiQuoteResponse {
  results?: BrapiQuoteResult[];
}

interface BrapiListStock {
  stock?: string;
  name?: string | null;
  close?: number | null;
}

interface BrapiListResponse {
  stocks?: BrapiListStock[];
}

/**
 * Cliente HTTP para a API da brapi.dev (https://brapi.dev/docs). Requer
 * `BRAPI_TOKEN` desde 2023; o plano pago permite até 10 tickers por
 * request via `fetchQuotes`.
 *
 * Degrada graciosamente: quando o token não está configurado, o ticker é
 * inválido ou a rede falha, retorna `null` (single) ou `[]` (batch) em
 * vez de propagar exceções, deixando o use case decidir o erro de
 * domínio.
 */
export class BrapiQuoteAdapter implements QuoteAdapter {
  private readonly token: string | undefined;
  private readonly baseUrl: string;
  private readonly listUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BrapiQuoteAdapterOptions = {}) {
    this.token = options.token ?? process.env.BRAPI_TOKEN;
    this.baseUrl = options.baseUrl ?? BASE_URL;
    this.listUrl = options.listUrl ?? LIST_URL;
    this.timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchQuote(ticker: string): Promise<StockQuoteResult | null> {
    const results = await this.fetchQuotes([ticker]);
    return results[0] ?? null;
  }

  async fetchQuotes(tickers: string[]): Promise<StockQuoteResult[]> {
    if (!Array.isArray(tickers) || tickers.length === 0) return [];
    if (tickers.length > MAX_BATCH) {
      throw new Error(
        `BrapiQuoteAdapter.fetchQuotes: máximo de ${MAX_BATCH} tickers por chamada (recebido ${tickers.length}).`,
      );
    }
    if (!this.token) return [];

    const clean = tickers
      .map((t) => (typeof t === "string" ? t.trim().toUpperCase() : ""))
      .filter((t) => t.length > 0);
    if (clean.length === 0) return [];

    const joined = clean.map((t) => encodeURIComponent(t)).join(",");
    const url = `${this.baseUrl}/${joined}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.token}` },
        // Cache cotações por 5 minutos no edge do Next.js.
        next: { revalidate: 300 },
      } as RequestInit);
      if (!response.ok) return [];
      const data = (await response.json()) as BrapiQuoteResponse;
      const results = Array.isArray(data?.results) ? data.results : [];
      const fetchedAt = new Date();
      const out: StockQuoteResult[] = [];
      for (const r of results) {
        if (!r || typeof r.regularMarketPrice !== "number") continue;
        if (!Number.isFinite(r.regularMarketPrice)) continue;
        const symbol = (r.symbol ?? "").trim().toUpperCase();
        if (symbol.length === 0) continue;
        const priceCents = BigInt(Math.round(r.regularMarketPrice * 100));
        const companyName =
          (typeof r.longName === "string" && r.longName.trim().length > 0 ? r.longName : null) ??
          (typeof r.shortName === "string" && r.shortName.trim().length > 0 ? r.shortName : null);
        out.push({
          symbol,
          priceCents,
          currency: r.currency ?? "BRL",
          fetchedAt,
          companyName,
        });
      }
      return out;
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  async listAvailableStocks(opts: ListAvailableStocksOptions = {}): Promise<StockListEntry[]> {
    if (!this.token) return [];

    const params = new URLSearchParams();
    if (opts.search && opts.search.trim().length > 0) {
      params.set("search", opts.search.trim());
    }
    if (typeof opts.limit === "number" && Number.isFinite(opts.limit) && opts.limit > 0) {
      params.set("limit", String(Math.floor(opts.limit)));
    }
    if (typeof opts.page === "number" && Number.isFinite(opts.page) && opts.page > 0) {
      params.set("page", String(Math.floor(opts.page)));
    }
    if (opts.sortBy && opts.sortBy.trim().length > 0) {
      params.set("sortBy", opts.sortBy.trim());
    }
    if (opts.sortOrder === "asc" || opts.sortOrder === "desc") {
      params.set("sortOrder", opts.sortOrder);
    }

    const qs = params.toString();
    const url = qs.length > 0 ? `${this.listUrl}?${qs}` : this.listUrl;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.token}` },
        // Cache lista por 1h no edge do Next.js (catálogo muda raramente).
        next: { revalidate: 3600 },
      } as RequestInit);
      if (!response.ok) return [];
      const data = (await response.json()) as BrapiListResponse;
      const stocks = Array.isArray(data?.stocks) ? data.stocks : [];
      const out: StockListEntry[] = [];
      for (const s of stocks) {
        if (!s) continue;
        const ticker = (s.stock ?? "").trim().toUpperCase();
        if (ticker.length === 0) continue;
        const name = typeof s.name === "string" && s.name.trim().length > 0 ? s.name.trim() : "";
        if (name.length === 0) continue;
        let priceCents: bigint | null = null;
        if (typeof s.close === "number" && Number.isFinite(s.close)) {
          priceCents = BigInt(Math.round(s.close * 100));
        }
        out.push({ ticker, name, priceCents });
      }
      return out;
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}
