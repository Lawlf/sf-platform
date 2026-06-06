import type { Currency } from "@/domain/value-objects/money.vo";

export interface ExchangeRateEntity {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rateDecimal: string;
  source: string;
  asOf: Date;
  fetchedAt: Date;
}
