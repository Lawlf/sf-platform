import type { Money } from "@/domain/value-objects/money.vo";

export type AssetCategory = "vehicle" | "real_estate" | "investment" | "cash" | "other";

export type DepreciationKind = "appreciating" | "stable" | "depreciating" | "consumable";

export type DeactivationKind = "sold" | "lost" | "donated" | "not_specified";

export type AssetMetadata =
  | {
      kind: "vehicle";
      brand: string;
      model: string;
      year: number;
      color?: string;
    }
  | {
      kind: "real_estate";
      addressCity: string;
      squareMeters?: number;
      rentMonthlyCents?: number;
    }
  | {
      kind: "investment";
      investmentType: "fixed_income" | "stocks" | "crypto" | "fund" | "other";
      institution?: string;
      /**
       * Ticker da ação (ex.: "PETR4", "VALE3") ou sigla da cripto (ex.: "BTC").
       */
      ticker?: string;
      // id CoinGecko (chave da cotação; símbolos não são únicos).
      coinId?: string;
      /**
       * Quantidade de ações detidas.
       */
      shares?: number;
      /**
       * Preço médio de compra por ação, em centavos.
       */
      avgPriceCents?: bigint;
      /**
       * Última cotação fetch'ada (centavos por ação).
       */
      lastQuoteCents?: bigint;
      /**
       * Momento em que `lastQuoteCents` foi buscado.
       */
      lastQuoteAt?: Date;
      // taxa a.a. só pra projeção de renda fixa; não altera currentValue.
      annualRatePct?: number;
    }
  | {
      kind: "cash";
      institution?: string;
      yieldType?: "none" | "cdi" | "fixed_pct_year";
      yieldRatePct?: number;
      /**
       * Última vez que o usuário revisou esta reserva (saldo e rendimento).
       * Usado pelo MaintenancePromptService para lembrar o usuário a cada
       * 30 dias de verificar se a taxa mudou ou se houve depósitos/saques.
       */
      lastReviewedAt?: Date;
    }
  | {
      kind: "other";
      description?: string;
    };

export interface AssetEntity {
  id: string;
  userId: string;
  category: AssetCategory;
  label: string;
  currentValue: Money;
  metadata: AssetMetadata | null;
  fipeCode: string | null;
  fipeLastSyncedAt: Date | null;
  acquiredAt: Date | null;
  depreciationKind: DepreciationKind;
  depreciationRatePctYear: number;
  purchaseDate: Date | null;
  /**
   * Quanto o usuário efetivamente pagou pelo ativo, em centavos. Usado para
   * mostrar ganho/perda quando comparado a `currentValue`. Opcional: ativos
   * antigos podem não ter esse dado.
   *
   * Para ações (`metadata.kind === "investment"` + `investmentType ===
   * "stocks"`), este campo é mantido redundantemente como
   * `shares * avgPriceCents` para consistência com o restante do app.
   */
  purchasePriceCents: bigint | null;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Para a Carteira default: quando `currentValue` foi fixado como âncora. O
   * saldo reativo acumula só eventos com data > `anchorAt`. `null` para os
   * demais ativos.
   */
  anchorAt: Date | null;
  deactivatedAt: Date | null;
  /**
   * Categoria estruturada do motivo da desativação. `null` para ativos
   * ativos. Para ativos desativados antes do schema ter esse campo, pode
   * permanecer `null` mesmo com `deactivatedAt` setado (backward compat).
   */
  deactivationKind: DeactivationKind | null;
  /**
   * Preço de venda, em centavos. Apenas preenchido quando
   * `deactivationKind === "sold"`. Permite calcular ganho/perda final do
   * ativo no momento da venda.
   */
  salePriceCents: bigint | null;
  /**
   * Notas livres do usuário sobre a desativação (opcional, complemento ao
   * `deactivationKind`).
   */
  deactivationReason: string | null;
  /**
   * Soft delete: quando preenchido, o ativo é tratado como apagado (não
   * aparece em listas, dashboard, timeline, patrimônio). Diferente de
   * `deactivatedAt`, que mantém o ativo no histórico (vendido/perdido/doado),
   * o soft delete remove definitivamente da visão do usuário. Sub-records
   * vinculados (alocações ativo-dívida) são hard-deletados pelo use case
   * `deleteAsset`. Mantemos a linha pra atender LGPD/auditoria.
   */
  deletedAt: Date | null;
  externalAccountKey: string | null;
}

export function isAssetActive(asset: AssetEntity): boolean {
  return asset.deactivatedAt === null;
}

/**
 * Throws if metadata is present and its `kind` does not match the asset
 * `category`. Returns `true` when consistent (or when metadata is `null`).
 */
export function assertMetadataMatchesCategory(
  category: AssetCategory,
  metadata: AssetMetadata | null,
): true {
  if (metadata === null) return true;
  if (metadata.kind !== category) {
    throw new Error(`AssetMetadata.kind (${metadata.kind}) does not match category (${category})`);
  }
  return true;
}
