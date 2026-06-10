import type { AssetEntity } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";

export interface InvestmentBucketTotal {
  investmentType: string;
  totalValueCents: bigint;
  count: number;
}

export function investmentBreakdown(assets: AssetEntity[]): InvestmentBucketTotal[] {
  const byType = new Map<string, { totalValueCents: bigint; count: number }>();
  for (const asset of assets) {
    if (asset.category !== "investment") continue;
    if (!isAssetActive(asset)) continue;
    const meta = asset.metadata;
    const type =
      meta && meta.kind === "investment" && typeof meta.investmentType === "string"
        ? meta.investmentType
        : "other";
    const prev = byType.get(type) ?? { totalValueCents: 0n, count: 0 };
    byType.set(type, {
      totalValueCents: prev.totalValueCents + asset.currentValue.toCents(),
      count: prev.count + 1,
    });
  }
  return Array.from(byType.entries()).map(([investmentType, v]) => ({
    investmentType,
    totalValueCents: v.totalValueCents,
    count: v.count,
  }));
}
