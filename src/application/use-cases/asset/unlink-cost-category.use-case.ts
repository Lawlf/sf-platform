import type { AssetCostCategoryRepositoryPort } from "@/domain/ports/repositories/asset-cost-category.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface UnlinkCostCategoryDeps {
  costCategories: Pick<AssetCostCategoryRepositoryPort, "unlink">;
}

export async function unlinkCostCategory(
  deps: UnlinkCostCategoryDeps,
  input: { profileId: string; categoryKey: string },
): Promise<Result<void, never>> {
  await deps.costCategories.unlink(input.profileId, input.categoryKey);
  return ok(undefined);
}
