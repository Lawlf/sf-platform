"use server";

import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { serializeMoney, type SerializedMoney } from "../../../../_actions/_serialize";

export interface CashAssetPayload {
  id: string;
  label: string;
  currentValue: SerializedMoney;
}

export async function listCashAssetsForPurchase(): Promise<CashAssetPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const profileId = await getActiveProfileId();
  const repo = repos.assets;
  const assets = await repo.findActiveByProfileAndCategory(profileId, "cash");
  return assets.map((a) => ({
    id: a.id,
    label: a.label,
    currentValue: serializeMoney(a.currentValue),
  }));
}
