import type { Currency } from "@/domain/value-objects/money.vo";

export interface FxPair {
  fromCurrency: Currency;
  toCurrency: Currency;
}

export interface FxRateQuote {
  fromCurrency: Currency;
  toCurrency: Currency;
  rateDecimal: string;
  asOf: Date;
}

export interface FxClient {
  fetchRates(pairs: FxPair[]): Promise<FxRateQuote[]>;
}
