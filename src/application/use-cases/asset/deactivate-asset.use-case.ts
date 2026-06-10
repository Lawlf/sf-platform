import type { AssetEntity, DeactivationKind } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import {
  AssetAlreadyDeactivated,
  AssetNotFound,
  InvalidAssetValue,
  InvalidDeactivationReason,
} from "@/domain/errors/asset-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface DeactivateAssetDeps {
  assets: AssetRepositoryPort;
  clock: Clock;
}

export interface DeactivateAssetInput {
  userId: string;
  assetId: string;
  /**
   * Categoria estruturada do motivo da desativação.
   */
  kind: DeactivationKind;
  /**
   * Preço de venda em centavos. Obrigatório se `kind === "sold"`; ignorado
   * caso contrário (não persiste).
   */
  salePriceCents?: bigint | null;
  /**
   * Notas livres opcionais (max 500 chars). Pode complementar o kind para
   * que o usuário registre detalhes ("vendido na OLX pra Fulano", etc.).
   */
  reason?: string | null;
}

export type DeactivateAssetError =
  | AssetNotFound
  | AssetAlreadyDeactivated
  | InvalidDeactivationReason
  | InvalidAssetValue;

/**
 * Marks an asset as deactivated. The asset row stays in storage (LGPD: no
 * destructive deletes from this use case); only `deactivatedAt`,
 * `deactivationKind`, `salePriceCents` (quando aplicável) e
 * `deactivationReason` são setados.
 */
export async function deactivateAsset(
  deps: DeactivateAssetDeps,
  input: DeactivateAssetInput,
): Promise<Result<AssetEntity, DeactivateAssetError>> {
  const existing = await deps.assets.findById(input.assetId, input.userId);
  if (!existing) return err(new AssetNotFound("Ativo não encontrado."));
  if (!isAssetActive(existing)) {
    return err(new AssetAlreadyDeactivated("Ativo já está desativado."));
  }

  // Validate optional free-text notes.
  let notes: string | null = null;
  if (input.reason !== undefined && input.reason !== null) {
    const trimmed = input.reason.trim();
    if (trimmed.length > 500) {
      return err(
        new InvalidDeactivationReason("Observações da desativação têm limite de 500 caracteres."),
      );
    }
    notes = trimmed.length > 0 ? trimmed : null;
  }

  // Sale price required when kind=sold; ignored otherwise.
  let salePriceCents: bigint | null = null;
  if (input.kind === "sold") {
    if (input.salePriceCents === undefined || input.salePriceCents === null) {
      return err(new InvalidAssetValue("Informe o preço de venda."));
    }
    if (input.salePriceCents < 0n) {
      return err(new InvalidAssetValue("Preço de venda não pode ser negativo."));
    }
    salePriceCents = input.salePriceCents;
  }

  const now = deps.clock.now();
  const updated: AssetEntity = {
    ...existing,
    deactivatedAt: now,
    deactivationKind: input.kind,
    salePriceCents,
    deactivationReason: notes,
    updatedAt: now,
  };

  await deps.assets.update(updated);
  return ok(updated);
}
