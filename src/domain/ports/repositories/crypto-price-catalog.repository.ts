import type { CryptoPriceCatalogEntity } from "@/domain/entities/crypto-price-catalog.entity";

export interface CryptoPriceCatalogUpsertEntry {
  coinId: string;
  lastPriceCents: bigint;
  lastFetchedAt: Date;
}

export interface CryptoPriceCatalogRepositoryPort {
  findByCoinId(coinId: string): Promise<CryptoPriceCatalogEntity | null>;
  upsertMany(entries: CryptoPriceCatalogUpsertEntry[]): Promise<void>;
}
