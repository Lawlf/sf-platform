export interface StockCatalogEntity {
  ticker: string;
  companyName: string | null;
  lastPriceCents: bigint | null;
  lastFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockCatalogUpsertEntry {
  ticker: string;
  companyName: string | null;
  lastPriceCents: bigint;
  lastFetchedAt: Date;
}

/**
 * Repositório do catálogo local de ações. O catálogo é uma tabela
 * compartilhada por todos os usuários: 1 cotação por ticker, com timestamp
 * da última atualização. Alimentado pelo refresh em lote (cron Pro) e
 * pelo refresh individual.
 */
export interface StockCatalogRepositoryPort {
  upsert(entry: StockCatalogUpsertEntry): Promise<void>;
  upsertMany(entries: StockCatalogUpsertEntry[]): Promise<void>;
  findByTicker(ticker: string): Promise<StockCatalogEntity | null>;
  /**
   * Busca ILIKE em ticker e companyName, ordenada por ticker. Retorna no
   * máximo `limit` linhas (default 20).
   */
  search(query: string, limit?: number): Promise<StockCatalogEntity[]>;
  listAll(limit?: number): Promise<StockCatalogEntity[]>;
  /**
   * Retorna tickers cuja `lastFetchedAt` é nula ou anterior a
   * `now - thresholdHours`. Útil para definir o que ainda precisa ser
   * atualizado dentro de uma janela diária.
   */
  listStaleTickers(thresholdHours: number): Promise<string[]>;
}
