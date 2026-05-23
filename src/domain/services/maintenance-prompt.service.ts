import type { AssetEntity } from "@/domain/entities/asset.entity";

const REVIEW_INTERVAL_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export interface MaintenancePromptItem {
  assetId: string;
  label: string;
  institution?: string;
  yieldDescription?: string;
  lastReviewedAt: Date | null;
  daysSinceReview: number;
}

interface CashMetadataLike {
  yieldType?: "none" | "cdi" | "fixed_pct_year";
  yieldRatePct?: number;
}

function formatRate(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function describeYield(metadata: CashMetadataLike): string | undefined {
  if (metadata.yieldType === "cdi" && typeof metadata.yieldRatePct === "number") {
    return `${formatRate(metadata.yieldRatePct)}% do CDI`;
  }
  if (metadata.yieldType === "fixed_pct_year" && typeof metadata.yieldRatePct === "number") {
    return `${formatRate(metadata.yieldRatePct)}% ao ano`;
  }
  return undefined;
}

/**
 * Serviço puro que identifica reservas (assets cash com rendimento) que
 * precisam de revisão periódica pelo usuário. O caller passa `asOf` para
 * manter o serviço determinístico e testável sem mocks de Date.
 *
 * Regra: reservas com yieldType definido (e diferente de "none") cuja
 * última revisão foi há mais de 30 dias entram na lista. Quando nunca
 * foram revisadas, usa-se `createdAt` como linha de base.
 */
export class MaintenancePromptService {
  static computeNeedsReview(assets: AssetEntity[], asOf: Date): MaintenancePromptItem[] {
    const items: MaintenancePromptItem[] = [];
    for (const asset of assets) {
      if (asset.category !== "cash") continue;
      if (!asset.metadata || asset.metadata.kind !== "cash") continue;
      if (!asset.metadata.yieldType || asset.metadata.yieldType === "none") continue;

      const lastReviewedAt = asset.metadata.lastReviewedAt ?? null;
      const baselineMs = lastReviewedAt ? lastReviewedAt.getTime() : asset.createdAt.getTime();
      const daysSinceReview = Math.floor((asOf.getTime() - baselineMs) / MS_PER_DAY);

      if (daysSinceReview < REVIEW_INTERVAL_DAYS) continue;

      const item: MaintenancePromptItem = {
        assetId: asset.id,
        label: asset.label,
        lastReviewedAt,
        daysSinceReview,
      };
      if (asset.metadata.institution !== undefined) {
        item.institution = asset.metadata.institution;
      }
      const yieldDescription = describeYield(asset.metadata);
      if (yieldDescription !== undefined) {
        item.yieldDescription = yieldDescription;
      }
      items.push(item);
    }
    return items.sort((a, b) => b.daysSinceReview - a.daysSinceReview);
  }
}
