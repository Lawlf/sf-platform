import { and, desc, eq, lte } from "drizzle-orm";

import type { ExchangeRateEntity } from "@/domain/entities/exchange-rate.entity";
import type { ExchangeRateRepository } from "@/domain/ports/repositories/exchange-rate.repository";
import type { Currency } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import {
  exchangeRates,
  type ExchangeRateRow,
} from "../schema/exchange-rates.schema";

function rowToEntity(row: ExchangeRateRow): ExchangeRateEntity {
  return {
    id: row.id,
    fromCurrency: row.fromCurrency as Currency,
    toCurrency: row.toCurrency as Currency,
    rateDecimal: row.rateDecimal,
    source: row.source,
    asOf: row.asOf,
    fetchedAt: row.fetchedAt,
  };
}

export class DrizzleExchangeRateRepository implements ExchangeRateRepository {
  async upsertDaily(
    rate: Omit<ExchangeRateEntity, "id" | "fetchedAt">,
  ): Promise<void> {
    await getDb()
      .insert(exchangeRates)
      .values({
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        rateDecimal: rate.rateDecimal,
        source: rate.source,
        asOf: rate.asOf,
      })
      .onConflictDoUpdate({
        target: [
          exchangeRates.fromCurrency,
          exchangeRates.toCurrency,
          exchangeRates.asOf,
          exchangeRates.source,
        ],
        set: { rateDecimal: rate.rateDecimal },
      });
  }

  async findLatest(
    fromCurrency: Currency,
    toCurrency: Currency,
    asOf: Date,
  ): Promise<ExchangeRateEntity | null> {
    const rows = await getDb()
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency),
          eq(exchangeRates.toCurrency, toCurrency),
          lte(exchangeRates.asOf, asOf),
        ),
      )
      .orderBy(desc(exchangeRates.asOf))
      .limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }
}
