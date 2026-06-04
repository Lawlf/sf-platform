import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { ProjectionAssetInput } from "@/domain/services/patrimony-projection.service";

import { resolveAssetMonthlyRate } from "./asset-rate";

export function buildProjectionAssetInputs(assets: AssetEntity[]): ProjectionAssetInput[] {
  return assets.map((asset) => ({
    assetId: asset.id,
    valueCents: asset.currentValue.toCents(),
    monthlyGrowthRate: resolveAssetMonthlyRate(asset),
  }));
}
