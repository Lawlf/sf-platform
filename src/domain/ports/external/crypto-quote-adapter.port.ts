export interface CryptoQuoteResult {
  symbol: string;
  coinId: string;
  priceCents: bigint;
  fetchedAt: Date;
}

export interface CryptoPriceById {
  coinId: string;
  priceCents: bigint;
  fetchedAt: Date;
}

export interface CryptoQuoteAdapter {
  fetchByIds(coinIds: string[]): Promise<CryptoPriceById[]>;
  fetchQuotes(symbols: string[]): Promise<CryptoQuoteResult[]>;
}
