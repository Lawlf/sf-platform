import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type {
  AssetCategory,
  AssetEntity,
  AssetMetadata,
  DepreciationKind,
} from "@/domain/entities/asset.entity";
import {
  AllocationExceedsPrincipal,
  AssetMetadataMismatch,
  DebtNotActive,
  InvalidAllocation,
  InvalidAssetLabel,
  InvalidAssetValue,
} from "@/domain/errors/asset-errors";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { type Currency, Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CreateAssetAllocationInput {
  debtId: string;
  allocationOriginalCents: bigint;
}

export interface CreateAssetInput {
  userId: string;
  category: AssetCategory;
  label: string;
  currentValueCents: bigint;
  currency: Currency;
  metadata: AssetMetadata | null;
  fipeCode: string | null;
  acquiredAt: Date | null;
  allocations: CreateAssetAllocationInput[];
  /**
   * Comportamento de valor. Default "stable" quando omitido.
   */
  depreciationKind?: DepreciationKind;
  /**
   * Taxa anual de depreciação (ou apreciação, se negativa). Default 0.
   */
  depreciationRatePctYear?: number;
  /**
   * Data da compra usada como referência para calcular depreciação.
   */
  purchaseDate?: Date | null;
  /**
   * Quanto o usuário efetivamente pagou pelo ativo, em centavos. Opcional.
   * Para ações, recomenda-se passar `shares * avgPriceCents` (espelhamento
   * redundante; o domínio não recalcula).
   */
  purchasePriceCents?: bigint | null;
}

export interface CreateAssetDeps {
  assets: AssetRepositoryPort;
  allocations: AssetDebtAllocationRepositoryPort;
  debts: DebtRepositoryPort;
  clock: Clock;
}

export type CreateAssetError =
  | InvalidAssetLabel
  | InvalidAssetValue
  | AssetMetadataMismatch
  | InvalidAllocation
  | DebtNotFound
  | Forbidden
  | DebtNotActive
  | AllocationExceedsPrincipal;

export async function createAsset(
  deps: CreateAssetDeps,
  input: CreateAssetInput,
): Promise<Result<AssetEntity, CreateAssetError>> {
  const label = input.label.trim();
  if (label.length === 0 || label.length > 120) {
    return err(new InvalidAssetLabel("Rótulo do ativo deve ter entre 1 e 120 caracteres."));
  }
  if (input.currentValueCents < 0n) {
    return err(new InvalidAssetValue("Valor do ativo não pode ser negativo."));
  }
  if (input.purchasePriceCents !== undefined && input.purchasePriceCents !== null) {
    if (input.purchasePriceCents < 0n) {
      return err(new InvalidAssetValue("Preço de compra não pode ser negativo."));
    }
  }

  if (input.metadata !== null && input.metadata.kind !== input.category) {
    return err(new AssetMetadataMismatch(input.category, input.metadata.kind));
  }

  // Validate each allocation against its debt and cumulative budget.
  for (const alloc of input.allocations) {
    if (alloc.allocationOriginalCents <= 0n) {
      return err(new InvalidAllocation("Alocação deve ser maior que zero."));
    }
    const debt = await deps.debts.findById(alloc.debtId);
    if (!debt) return err(new DebtNotFound(`Dívida ${alloc.debtId} não encontrada.`));
    if (debt.userId !== input.userId) {
      return err(new Forbidden("Acesso negado à dívida informada."));
    }
    if (debt.status !== "active") {
      return err(new DebtNotActive(alloc.debtId));
    }
    const currentSum = await deps.allocations.sumAllocationsByDebt(alloc.debtId);
    const principalCents = debt.originalPrincipal.toCents();
    const totalAfter = currentSum.toCents() + alloc.allocationOriginalCents;
    if (totalAfter > principalCents) {
      const available = principalCents - currentSum.toCents();
      return err(new AllocationExceedsPrincipal(alloc.debtId, available));
    }
  }

  const now = deps.clock.now();
  const asset: AssetEntity = {
    id: crypto.randomUUID(),
    userId: input.userId,
    category: input.category,
    label,
    currentValue: Money.fromCents(input.currentValueCents, input.currency),
    metadata: input.metadata,
    fipeCode: input.fipeCode,
    fipeLastSyncedAt: null,
    acquiredAt: input.acquiredAt,
    depreciationKind: input.depreciationKind ?? "stable",
    depreciationRatePctYear: input.depreciationRatePctYear ?? 0,
    purchaseDate: input.purchaseDate ?? null,
    purchasePriceCents: input.purchasePriceCents ?? null,
    createdAt: now,
    updatedAt: now,
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };

  await deps.assets.create(asset);
  for (const alloc of input.allocations) {
    const allocation: AssetDebtAllocation = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      debtId: alloc.debtId,
      allocationOriginal: Money.fromCents(alloc.allocationOriginalCents, input.currency),
      createdAt: now,
      updatedAt: now,
    };
    await deps.allocations.upsert(allocation);
  }

  return ok(asset);
}
