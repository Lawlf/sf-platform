import { AssetNotFound } from "@/domain/errors/asset-errors";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface UnlinkAssetFromDebtDeps {
  assets: AssetRepositoryPort;
  allocations: AssetDebtAllocationRepositoryPort;
}

export interface UnlinkAssetFromDebtInput {
  userId: string;
  assetId: string;
  debtId: string;
}

export type UnlinkAssetFromDebtError = AssetNotFound;

/**
 * Removes the allocation between the given asset and debt. If no allocation
 * exists, the repository delete is a no-op. We still resolve the asset under
 * the caller's userId so that we cannot unlink allocations off assets we do
 * not own (defense in depth, the row-level scoping is the source of truth).
 */
export async function unlinkAssetFromDebt(
  deps: UnlinkAssetFromDebtDeps,
  input: UnlinkAssetFromDebtInput,
): Promise<Result<void, UnlinkAssetFromDebtError>> {
  const asset = await deps.assets.findById(input.assetId, input.userId);
  if (!asset) return err(new AssetNotFound("Ativo não encontrado."));

  await deps.allocations.delete(input.assetId, input.debtId);
  return ok(undefined);
}
