import type { Money } from "@/domain/value-objects/money.vo";

export interface AssetDebtAllocation {
  id: string;
  assetId: string;
  debtId: string;
  /**
   * Valor original alocado deste ativo na dívida, em moeda. Os cálculos de
   * patrimônio usam esse valor proporcionalmente ao `originalPrincipal` da
   * dívida para inferir quanto do saldo atual pertence a este ativo.
   */
  allocationOriginal: Money;
  createdAt: Date;
  updatedAt: Date;
}
