"use server";

import type { AssetCategory } from "@/domain/entities/asset.entity";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export interface AttributableAssetOption {
  id: string;
  label: string;
  category: AssetCategory;
}

/**
 * Bens aos quais um lançamento pode ser atribuído como custo/renda de posse.
 * Exclui contas de caixa (Carteira/contas): atribuir gasto à própria conta de
 * dinheiro não faz sentido; o custo de propriedade é dos bens reais.
 */
export async function listAttributableAssets(): Promise<AttributableAssetOption[]> {
  await requireUser();
  const profileId = await getActiveProfileId();
  const assets = await repos.assets.findActiveByProfile(profileId);
  return assets
    .filter((a) => a.category !== "cash")
    .map((a) => ({ id: a.id, label: a.label, category: a.category }));
}
