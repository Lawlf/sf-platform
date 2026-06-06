import type { FxClient, FxPair, FxRateQuote } from "@/domain/ports/external/fx-client.port";

const BASE_URL = "https://economia.awesomeapi.com.br/json/last";
const TIMEOUT_MS = 8000;

interface AwesomeApiPairQuote {
  code: string;
  codein: string;
  bid: string;
  create_date: string;
}

type AwesomeApiResponse = Record<string, AwesomeApiPairQuote>;

export interface AwesomeApiFxClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class AwesomeApiFxClient implements FxClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AwesomeApiFxClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.EXCHANGE_RATE_API_URL ?? BASE_URL;
    this.timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchRates(pairs: FxPair[]): Promise<FxRateQuote[]> {
    if (pairs.length === 0) return [];
    const path = pairs.map((p) => `${p.fromCurrency}-${p.toCurrency}`).join(",");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/${path}`, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      throw new Error(`AwesomeAPI request failed: ${res.status}`);
    }
    const data = (await res.json()) as AwesomeApiResponse;
    const quotes: FxRateQuote[] = [];
    for (const p of pairs) {
      const key = `${p.fromCurrency}${p.toCurrency}`;
      const entry = data[key];
      if (!entry) continue;
      quotes.push({
        fromCurrency: p.fromCurrency,
        toCurrency: p.toCurrency,
        rateDecimal: entry.bid,
        asOf: new Date(entry.create_date.replace(" ", "T")),
      });
    }
    return quotes;
  }
}
