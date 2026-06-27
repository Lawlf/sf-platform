import type { AssetEntity, AssetMetadata } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import {
  AssetDeactivated,
  AssetMetadataMismatch,
  AssetNotFound,
  InvalidAssetLabel,
  InvalidAssetValue,
} from "@/domain/errors/asset-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface UpdateAssetDeps {
  assets: AssetRepositoryPort;
  clock: Clock;
}

export interface UpdateAssetInput {
  profileId: string;
  assetId: string;
  label?: string;
  currentValueCents?: bigint;
  metadata?: AssetMetadata | null;
  fipeCode?: string | null;
  acquiredAt?: Date | null;
  /** Estimativa mensal de custo. Omitido = não muda; null = limpa; valor >= 0. */
  monthlyCostEstimateCents?: bigint | null;
}

export type UpdateAssetError =
  | AssetNotFound
  | AssetDeactivated
  | InvalidAssetLabel
  | InvalidAssetValue
  | AssetMetadataMismatch;

export async function updateAsset(
  deps: UpdateAssetDeps,
  input: UpdateAssetInput,
): Promise<Result<AssetEntity, UpdateAssetError>> {
  const existing = await deps.assets.findById(input.assetId, input.profileId);
  if (!existing) return err(new AssetNotFound("Ativo não encontrado."));
  if (!isAssetActive(existing)) {
    return err(new AssetDeactivated("Ativo está desativado e não pode ser editado."));
  }

  let nextLabel = existing.label;
  if (input.label !== undefined) {
    const trimmed = input.label.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      return err(new InvalidAssetLabel("Rótulo do ativo deve ter entre 1 e 120 caracteres."));
    }
    nextLabel = trimmed;
  }

  let nextValue = existing.currentValue;
  if (input.currentValueCents !== undefined) {
    if (input.currentValueCents < 0n) {
      return err(new InvalidAssetValue("Valor do ativo não pode ser negativo."));
    }
    nextValue = Money.fromCents(input.currentValueCents, existing.currentValue.currency);
  }

  let nextMetadata = existing.metadata;
  if (input.metadata !== undefined) {
    if (input.metadata !== null && input.metadata.kind !== existing.category) {
      return err(new AssetMetadataMismatch(existing.category, input.metadata.kind));
    }
    nextMetadata = input.metadata;
  }

  if (
    input.monthlyCostEstimateCents !== undefined &&
    input.monthlyCostEstimateCents !== null &&
    input.monthlyCostEstimateCents < 0n
  ) {
    return err(new InvalidAssetValue("A estimativa mensal não pode ser negativa."));
  }

  const updated: AssetEntity = {
    ...existing,
    label: nextLabel,
    currentValue: nextValue,
    metadata: nextMetadata,
    ...(input.fipeCode !== undefined && { fipeCode: input.fipeCode }),
    ...(input.acquiredAt !== undefined && { acquiredAt: input.acquiredAt }),
    ...(input.monthlyCostEstimateCents !== undefined && {
      monthlyCostEstimateCents: input.monthlyCostEstimateCents,
    }),
    updatedAt: deps.clock.now(),
  };

  await deps.assets.update(updated);
  return ok(updated);
}
