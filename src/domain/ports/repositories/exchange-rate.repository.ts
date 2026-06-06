import type { ExchangeRateEntity } from "@/domain/entities/exchange-rate.entity";
import type { Currency } from "@/domain/value-objects/money.vo";

export interface ExchangeRateRepository {
  upsertDaily(rate: Omit<ExchangeRateEntity, "id" | "fetchedAt">): Promise<void>;
  findLatest(
    fromCurrency: Currency,
    toCurrency: Currency,
    asOf: Date,
  ): Promise<ExchangeRateEntity | null>;
}
