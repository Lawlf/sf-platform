import type { AssetEntity } from "@/domain/entities/asset.entity";

export const DEFAULT_CDI_ANNUAL_PCT = 12;

export function annualPctToMonthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

export function resolveAssetMonthlyRate(asset: AssetEntity): number {
  const metadata = asset.metadata;
  if (metadata?.kind === "cash") {
    if (metadata.yieldType === "fixed_pct_year" && typeof metadata.yieldRatePct === "number") {
      return annualPctToMonthlyRate(metadata.yieldRatePct);
    }
    if (metadata.yieldType === "cdi" && typeof metadata.yieldRatePct === "number") {
      return annualPctToMonthlyRate((metadata.yieldRatePct / 100) * DEFAULT_CDI_ANNUAL_PCT);
    }
    return 0;
  }
  if (asset.depreciationRatePctYear === 0) return 0;
  const annualFactor = 1 - asset.depreciationRatePctYear / 100;
  if (annualFactor <= 0) return -1;
  return Math.pow(annualFactor, 1 / 12) - 1;
}

export function resolveLiquidBucketRate(
  assets: AssetEntity[],
  liquidBucketAssetId: string | null,
): number {
  if (liquidBucketAssetId === null) return 0;
  const bucket = assets.find((a) => a.id === liquidBucketAssetId);
  if (!bucket) return 0;
  return resolveAssetMonthlyRate(bucket);
}
