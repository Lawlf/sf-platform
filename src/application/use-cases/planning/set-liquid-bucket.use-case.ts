import type { FinancialPlanningSettingsEntity } from "@/domain/entities/financial-planning-settings.entity";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { FinancialPlanningSettingsRepositoryPort } from "@/domain/ports/repositories/financial-planning-settings.repository";

export interface SetLiquidBucketDeps {
  assets: AssetRepositoryPort;
  settings: FinancialPlanningSettingsRepositoryPort;
}

export type SetLiquidBucketResult =
  | { ok: true; settings: FinancialPlanningSettingsEntity }
  | { ok: false; message: string };

export async function setLiquidBucket(
  { assets, settings }: SetLiquidBucketDeps,
  { userId, profileId, assetId }: { userId: string; profileId: string; assetId: string | null },
): Promise<SetLiquidBucketResult> {
  if (assetId !== null) {
    const asset = await assets.findById(assetId, profileId);
    if (!asset) {
      return { ok: false, message: "Ativo não encontrado." };
    }
    if (asset.category !== "cash") {
      return { ok: false, message: "O balde precisa ser uma reserva (dinheiro)." };
    }
  }

  const saved = await settings.upsertLiquidBucket(profileId, assetId);
  return { ok: true, settings: saved };
}
