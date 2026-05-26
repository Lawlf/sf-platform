import type { AssetEntity } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import { AssetDeactivated, AssetNotCash, AssetNotFound } from "@/domain/errors/asset-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface MarkAssetReviewedDeps {
  assets: AssetRepository;
  clock: Clock;
}

export interface MarkAssetReviewedInput {
  userId: string;
  assetId: string;
}

export type MarkAssetReviewedError = AssetNotFound | AssetDeactivated | AssetNotCash;

/**
 * Marca a reserva como "revisada agora" sem alterar saldo nem rendimento.
 * Apenas bump em `metadata.lastReviewedAt` e em `updatedAt`. Reset do
 * contador usado pelo MaintenancePromptService.
 */
export async function markAssetReviewed(
  deps: MarkAssetReviewedDeps,
  input: MarkAssetReviewedInput,
): Promise<Result<AssetEntity, MarkAssetReviewedError>> {
  const existing = await deps.assets.findById(input.assetId, input.userId);
  if (!existing) return err(new AssetNotFound("Ativo nao encontrado."));
  if (!isAssetActive(existing)) {
    return err(new AssetDeactivated("Ativo desativado nao pode ser revisado."));
  }
  if (!existing.metadata || existing.metadata.kind !== "cash") {
    return err(new AssetNotCash());
  }

  const now = deps.clock.now();
  const updated: AssetEntity = {
    ...existing,
    metadata: {
      ...existing.metadata,
      lastReviewedAt: now,
    },
    updatedAt: now,
  };
  await deps.assets.update(updated);
  return ok(updated);
}
