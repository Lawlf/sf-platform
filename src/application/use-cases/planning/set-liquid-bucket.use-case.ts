import type { FinancialPlanningSettingsEntity } from "@/domain/entities/financial-planning-settings.entity";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { FinancialPlanningSettingsRepository } from "@/domain/ports/repositories/financial-planning-settings.repository";

export interface SetLiquidBucketDeps {
  assets: AssetRepository;
  settings: FinancialPlanningSettingsRepository;
}

export type SetLiquidBucketResult =
  | { ok: true; settings: FinancialPlanningSettingsEntity }
  | { ok: false; message: string };

export async function setLiquidBucket(
  { assets, settings }: SetLiquidBucketDeps,
  { userId, assetId }: { userId: string; assetId: string | null },
): Promise<SetLiquidBucketResult> {
  if (assetId !== null) {
    const asset = await assets.findById(assetId, userId);
    if (!asset) {
      return { ok: false, message: "Ativo não encontrado." };
    }
    if (asset.category !== "cash") {
      return { ok: false, message: "O balde precisa ser uma reserva (dinheiro)." };
    }
  }

  const saved = await settings.upsertLiquidBucket(userId, assetId);
  return { ok: true, settings: saved };
}
