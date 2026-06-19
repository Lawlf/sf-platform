import type { AssetEntity } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import {
  AssetDeactivated,
  AssetFipeNotApplicable,
  AssetFipeRefreshFailed,
  AssetNotFound,
} from "@/domain/errors/asset-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { FipeClient } from "@/domain/ports/external/fipe-client.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RefreshAssetFromFipeDeps {
  assets: AssetRepositoryPort;
  fipe: FipeClient;
  clock: Clock;
}

export interface RefreshAssetFromFipeInput {
  profileId: string;
  assetId: string;
}

export interface RefreshAssetFromFipeOutput {
  asset: AssetEntity;
}

export type RefreshAssetFromFipeError =
  | AssetNotFound
  | AssetDeactivated
  | AssetFipeNotApplicable
  | AssetFipeRefreshFailed;

/**
 * Refreshes an asset's currentValue from the FIPE table. Only valid for assets
 * with category `vehicle` and a configured `fipeCode`. Updates
 * `fipeLastSyncedAt` on success.
 */
export async function refreshAssetFromFipe(
  deps: RefreshAssetFromFipeDeps,
  input: RefreshAssetFromFipeInput,
): Promise<Result<RefreshAssetFromFipeOutput, RefreshAssetFromFipeError>> {
  const asset = await deps.assets.findById(input.assetId, input.profileId);
  if (!asset) return err(new AssetNotFound("Ativo não encontrado."));
  if (!isAssetActive(asset)) {
    return err(new AssetDeactivated("Ativo desativado não pode ser atualizado via FIPE."));
  }
  if (asset.category !== "vehicle" || !asset.fipeCode) {
    return err(new AssetFipeNotApplicable());
  }

  let data;
  try {
    data = await deps.fipe.getVehicleValue(asset.fipeCode);
  } catch (e) {
    return err(new AssetFipeRefreshFailed((e as Error).message));
  }

  const now = deps.clock.now();
  const updated: AssetEntity = {
    ...asset,
    currentValue: data.value,
    fipeLastSyncedAt: now,
    updatedAt: now,
  };
  await deps.assets.update(updated);
  return ok({ asset: updated });
}
