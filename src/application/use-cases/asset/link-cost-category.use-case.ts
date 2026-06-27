import crypto from "node:crypto";

import type { AssetCostCategory } from "@/domain/entities/asset-cost-category.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetCostCategoryRepositoryPort } from "@/domain/ports/repositories/asset-cost-category.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface LinkCostCategoryDeps {
  costCategories: Pick<AssetCostCategoryRepositoryPort, "link">;
  assets: Pick<AssetRepositoryPort, "findById">;
  clock: Clock;
}

export async function linkCostCategory(
  deps: LinkCostCategoryDeps,
  input: { profileId: string; assetId: string; categoryKey: string },
): Promise<Result<AssetCostCategory, Forbidden>> {
  const asset = await deps.assets.findById(input.assetId, input.profileId);
  if (!asset || asset.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  const entity: AssetCostCategory = {
    id: crypto.randomUUID(),
    profileId: input.profileId,
    assetId: input.assetId,
    categoryKey: input.categoryKey,
    createdAt: deps.clock.now(),
  };
  await deps.costCategories.link(entity);
  return ok(entity);
}
