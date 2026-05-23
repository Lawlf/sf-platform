export interface StockQuoteResult {
  symbol: string;
  /**
   * Preço cotado por ação, em centavos.
   */
  priceCents: bigint;
  /**
   * Moeda da cotação (ex.: "BRL").
   */
  currency: string;
  fetchedAt: Date;
  /**
   * Nome da empresa (longName ou shortName) quando disponível.
   */
  companyName?: string | null;
}

export interface StockListEntry {
  ticker: string;
  name: string;
  /**
   * Preço de fechamento em centavos, quando disponível.
   */
  priceCents: bigint | null;
}

export interface ListAvailableStocksOptions {
  search?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: "desc" | "asc";
}

/**
 * Porta para clientes de cotação de ações (B3, etc.).
 */
export interface QuoteAdapter {
  /**
   * Busca a cotação atual de um ticker. Retorna `null` quando a cotação não
   * está disponível (token ausente, ticker inválido, falha de rede, etc.).
   */
  fetchQuote(ticker: string): Promise<StockQuoteResult | null>;
  /**
   * Busca cotações em lote (até 10 tickers por chamada na brapi paga).
   * Tickers inválidos ou ausentes na resposta são omitidos do array
   * retornado. Retorna `[]` quando a chamada falha por completo.
   */
  fetchQuotes(tickers: string[]): Promise<StockQuoteResult[]>;
  /**
   * Lista ações disponíveis na fonte externa (ex.: brapi `/api/quote/list`).
   * Suporta paginação e ordenação. Retorna `[]` quando o token não está
   * configurado ou a chamada falha.
   */
  listAvailableStocks(opts?: ListAvailableStocksOptions): Promise<StockListEntry[]>;
}
