import { AssetNotFound } from "@/domain/errors/asset-errors";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface DeleteAssetDeps {
  assets: AssetRepositoryPort;
  allocations: AssetDebtAllocationRepositoryPort;
  clock: Clock;
}

export interface DeleteAssetInput {
  userId: string;
  profileId: string;
  assetId: string;
}

/**
 * Apaga um ativo do registro do usuário. Diferente de `deactivateAsset`
 * (vendido/perdido/doado/arquivado), que mantém o ativo no histórico, este
 * use case remove o ativo da visão do usuário definitivamente.
 *
 * - O ativo recebe soft delete (`deleted_at = now()`), atendendo LGPD/auditoria.
 *   Repositórios filtram `deleted_at IS NULL` em todas as leituras, então a UI
 *   nunca enxerga a linha.
 * - Alocações ativo-dívida vinculadas a este ativo são hard-deletadas, pois
 *   são sub-records (vínculo asset <-> debt) sem valor isolado: quando o
 *   ativo some, o vínculo também deve sumir. As dívidas em si permanecem
 *   (podem estar vinculadas a outros ativos ou serem revisitadas).
 */
export async function deleteAsset(
  deps: DeleteAssetDeps,
  input: DeleteAssetInput,
): Promise<Result<void, AssetNotFound | Forbidden>> {
  const existing = await deps.assets.findById(input.assetId, input.profileId);
  if (!existing) return err(new AssetNotFound("Ativo não encontrado."));
  if (existing.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  await deps.allocations.deleteByAssetId(input.assetId);
  await deps.assets.softDelete(input.assetId, deps.clock.now());

  return ok(undefined);
}
