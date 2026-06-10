import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { AssetCategory, AssetEntity } from "@/domain/entities/asset.entity";

export interface AssetWithAllocations {
  asset: AssetEntity;
  allocations: AssetDebtAllocation[];
}

export interface AssetRepositoryPort {
  create(asset: AssetEntity): Promise<void>;
  /**
   * Insere a Carteira padrão de forma idempotente no nível do banco. Se já
   * existir uma Carteira ativa para o usuário, o INSERT vira no-op
   * (ON CONFLICT DO NOTHING sobre o índice único parcial), evitando a corrida
   * de check-then-insert que duplicava a Carteira em entradas concorrentes
   * no app.
   */
  createDefaultWallet(asset: AssetEntity): Promise<void>;
  update(asset: AssetEntity): Promise<void>;
  /**
   * Retorna o ativo pelo id ou `null`. Ignora linhas soft-deleted
   * (`deleted_at IS NOT NULL`) por padrão; a UI nunca deve enxergar um ativo
   * apagado via esse método.
   */
  findById(id: string, userId: string): Promise<AssetEntity | null>;
  /**
   * Retorna ativos ativos (não desativados e não apagados) do usuário.
   * Filtra `deactivated_at IS NULL` E `deleted_at IS NULL`.
   */
  findActiveByUser(userId: string): Promise<AssetEntity[]>;
  /**
   * Mesma semântica de `findActiveByUser`, restringindo por categoria.
   */
  findActiveByUserAndCategory(userId: string, category: AssetCategory): Promise<AssetEntity[]>;
  findByIdWithAllocations(id: string, userId: string): Promise<AssetWithAllocations | null>;
  findActiveWithAllocations(userId: string): Promise<AssetWithAllocations[]>;
  /**
   * Retorna todos os tickers (uppercase, deduplicados) presentes em ativos
   * ativos de investimento do tipo `stocks` pertencentes ao usuário.
   */
  listStockTickersForUser(userId: string): Promise<string[]>;
  /**
   * Retorna todos os símbolos (uppercase, deduplicados) presentes em ativos
   * ativos de investimento do tipo `crypto` pertencentes ao usuário.
   */
  listCryptoTickersForUser(userId: string): Promise<string[]>;
  /**
   * Marca o ativo como apagado (soft delete). Usado pelo use case
   * `deleteAsset`. Sub-records (asset_debt_allocations) são removidos pelo
   * próprio use case via repositório dedicado antes do soft delete aqui.
   */
  softDelete(id: string, deletedAt: Date): Promise<void>;
  findByExternalAccountKey(userId: string, key: string): Promise<AssetEntity | null>;
  listExternalAccountKeys(userId: string): Promise<string[]>;
}
