import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

/**
 * Carteira padrão (o "balde"): o ativo cash inicial de todo usuário, de onde o
 * dinheiro sai e pra onde entra quando ele não escolhe outra conta. Saldo
 * inicial zero.
 */
export function buildDefaultWallet(
  userId: string,
  profileId: string,
  id: string,
  now: Date,
): AssetEntity {
  return {
    id,
    userId,
    profileId,
    category: "cash",
    label: "Carteira",
    currentValue: Money.zero(),
    metadata: { kind: "cash", yieldType: "none" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    monthlyCostEstimateCents: null,
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
}
