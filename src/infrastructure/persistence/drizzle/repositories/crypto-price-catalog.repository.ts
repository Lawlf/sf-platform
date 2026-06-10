import { eq, sql } from "drizzle-orm";

import type { CryptoPriceCatalogEntity } from "@/domain/entities/crypto-price-catalog.entity";
import type {
  CryptoPriceCatalogRepositoryPort,
  CryptoPriceCatalogUpsertEntry,
} from "@/domain/ports/repositories/crypto-price-catalog.repository";

import { getDb } from "../client";
import {
  cryptoPriceCatalog,
  type CryptoPriceCatalogRow,
} from "../schema/crypto-price-catalog.schema";

function toEntity(row: CryptoPriceCatalogRow): CryptoPriceCatalogEntity {
  return {
    coinId: row.coinId,
    lastPriceCents: row.lastPriceCents,
    lastFetchedAt: row.lastFetchedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeCoinId(coinId: string): string {
  return coinId.trim().toLowerCase();
}

export class CryptoPriceCatalogRepository implements CryptoPriceCatalogRepositoryPort {
  async findByCoinId(coinId: string): Promise<CryptoPriceCatalogEntity | null> {
    const normalized = normalizeCoinId(coinId);
    const rows = await getDb()
      .select()
      .from(cryptoPriceCatalog)
      .where(eq(cryptoPriceCatalog.coinId, normalized))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async upsertMany(entries: CryptoPriceCatalogUpsertEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const values = entries.map((e) => ({
      coinId: normalizeCoinId(e.coinId),
      lastPriceCents: e.lastPriceCents,
      lastFetchedAt: e.lastFetchedAt,
    }));
    await getDb()
      .insert(cryptoPriceCatalog)
      .values(values)
      .onConflictDoUpdate({
        target: cryptoPriceCatalog.coinId,
        set: {
          lastPriceCents: sql`excluded.last_price_cents`,
          lastFetchedAt: sql`excluded.last_fetched_at`,
          updatedAt: sql`now()`,
        },
      });
  }
}
