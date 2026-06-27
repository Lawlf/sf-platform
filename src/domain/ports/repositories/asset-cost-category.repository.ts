import type { AssetCostCategory } from "@/domain/entities/asset-cost-category.entity";

export interface AssetCostCategoryRepositoryPort {
  listByAsset(assetId: string, profileId: string): Promise<AssetCostCategory[]>;
  /** Liga a categoria ao bem. Como (profile, category) é único, mover a categoria pra outro bem substitui o vínculo. */
  link(entity: AssetCostCategory): Promise<void>;
  unlink(profileId: string, categoryKey: string): Promise<void>;
}
