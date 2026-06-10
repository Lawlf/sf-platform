export interface CryptoPriceCatalogEntity {
  coinId: string;
  lastPriceCents: bigint | null;
  lastFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
