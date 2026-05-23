import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { Money } from "@/domain/value-objects/money.vo";

export interface AssetDebtAllocationRepository {
  upsert(allocation: AssetDebtAllocation): Promise<void>;
  delete(assetId: string, debtId: string): Promise<void>;
  /**
   * Remove TODAS as alocações vinculadas à dívida. Hard delete. Usado pelo
   * use case `deleteDebt`: alocações são sub-records (vínculo asset <-> debt)
   * sem valor isolado; quando a dívida some, o vínculo também deve sumir.
   */
  deleteByDebtId(debtId: string): Promise<void>;
  /**
   * Remove TODAS as alocações vinculadas ao ativo. Hard delete. Usado pelo
   * use case `deleteAsset`: alocações são sub-records (vínculo asset <-> debt)
   * sem valor isolado; quando o ativo some, o vínculo também deve sumir.
   */
  deleteByAssetId(assetId: string): Promise<void>;
  findByAsset(assetId: string): Promise<AssetDebtAllocation[]>;
  findByDebt(debtId: string): Promise<AssetDebtAllocation[]>;
  /**
   * Soma `allocation_original_cents` para a dívida informada. Se
   * `excludeAssetId` for fornecido, exclui o par (asset, debt) atual da soma,
   * útil para o caso de re-link onde o use case precisa saber o quanto JÁ
   * está alocado por OUTROS ativos antes de validar o limite.
   */
  sumAllocationsByDebt(debtId: string, excludeAssetId?: string): Promise<Money>;
}
