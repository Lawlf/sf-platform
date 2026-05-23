"use server";

import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { serializeMoney, type SerializedMoney } from "../../../../_actions/_serialize";

export interface CashAssetPayload {
  id: string;
  label: string;
  currentValue: SerializedMoney;
}

// Lista os ativos de categoria "cash" ativos do usuário corrente. Usado no Step 3
// do wizard "Comprei algo novo" para perguntar de qual conta saiu o dinheiro quando
// o método de pagamento é "à vista". Retorna lista vazia quando não há usuário.
export async function listCashAssetsForPurchase(): Promise<CashAssetPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const repo = new DrizzleAssetRepository();
  const assets = await repo.findActiveByUserAndCategory(user.id, "cash");
  return assets.map((a) => ({
    id: a.id,
    label: a.label,
    currentValue: serializeMoney(a.currentValue),
  }));
}
