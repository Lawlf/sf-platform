import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
import { AssetCostService, type AssetCostView } from "@/domain/services/asset-cost.service";

export interface GetAssetCostDeps {
  transactions: Pick<TransactionRepositoryPort, "listByAttributedAsset">;
  assets: Pick<AssetRepositoryPort, "findById">;
  clock: Clock;
}

export interface GetAssetCostResult {
  asset: { id: string; label: string };
  hasPurchaseDate: boolean;
  cost: AssetCostView;
}

export async function getAssetCost(
  deps: GetAssetCostDeps,
  input: { profileId: string; assetId: string },
): Promise<GetAssetCostResult | null> {
  const asset = await deps.assets.findById(input.assetId, input.profileId);
  if (!asset) return null;

  const txns = await deps.transactions.listByAttributedAsset(input.assetId, input.profileId);
  const cost = AssetCostService.compute(
    txns.map((t) => ({
      occurredAt: t.occurredAt,
      direction: t.direction,
      amountCents: t.amount.toCents(),
      category: t.category,
      currency: t.amount.currency,
      excludedFromTotals: t.excludedFromTotals,
      deletedAt: t.deletedAt,
    })),
    { referenceDate: deps.clock.now(), purchaseDate: asset.purchaseDate },
  );

  return {
    asset: { id: asset.id, label: asset.label },
    hasPurchaseDate: asset.purchaseDate !== null,
    cost,
  };
}
