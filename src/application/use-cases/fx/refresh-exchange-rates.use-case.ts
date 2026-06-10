import type { Clock } from "@/domain/ports/clock.port";
import type { FxClient, FxPair } from "@/domain/ports/external/fx-client.port";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";

const SOURCE = "awesomeapi";

export const FX_PAIRS: FxPair[] = [
  { fromCurrency: "USD", toCurrency: "BRL" },
  { fromCurrency: "EUR", toCurrency: "BRL" },
  { fromCurrency: "GBP", toCurrency: "BRL" },
];

export interface RefreshExchangeRatesDeps {
  client: FxClient;
  rates: ExchangeRateRepositoryPort;
  clock: Clock;
}

export interface RefreshExchangeRatesResult {
  ratesWritten: number;
  failed: boolean;
}

export async function refreshExchangeRates(
  deps: RefreshExchangeRatesDeps,
): Promise<RefreshExchangeRatesResult> {
  let quotes;
  try {
    quotes = await deps.client.fetchRates(FX_PAIRS);
  } catch {
    return { ratesWritten: 0, failed: true };
  }

  let ratesWritten = 0;
  for (const q of quotes) {
    await deps.rates.upsertDaily({
      fromCurrency: q.fromCurrency,
      toCurrency: q.toCurrency,
      rateDecimal: q.rateDecimal,
      source: SOURCE,
      asOf: q.asOf,
    });
    ratesWritten += 1;
  }
  return { ratesWritten, failed: false };
}
