import type { AssetEntity } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import { AssetAlreadyActive, AssetNotFound } from "@/domain/errors/asset-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface ReactivateAssetDeps {
  assets: AssetRepositoryPort;
  clock: Clock;
}

export interface ReactivateAssetInput {
  userId: string;
  assetId: string;
}

export type ReactivateAssetError = AssetNotFound | AssetAlreadyActive;

export async function reactivateAsset(
  deps: ReactivateAssetDeps,
  input: ReactivateAssetInput,
): Promise<Result<AssetEntity, ReactivateAssetError>> {
  const existing = await deps.assets.findById(input.assetId, input.userId);
  if (!existing) return err(new AssetNotFound("Ativo não encontrado."));
  if (isAssetActive(existing)) {
    return err(new AssetAlreadyActive("Ativo já está ativo."));
  }

  const now = deps.clock.now();
  const updated: AssetEntity = {
    ...existing,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    updatedAt: now,
  };
  await deps.assets.update(updated);
  return ok(updated);
}
