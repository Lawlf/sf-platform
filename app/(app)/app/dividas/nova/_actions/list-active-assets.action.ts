"use server";

import { repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { serializeMoney, type SerializedMoney } from "../../../_actions/_serialize";

export interface ActiveAssetPayload {
  id: string;
  label: string;
  category: string;
  currentValue: SerializedMoney;
}

// Lista os ativos ativos do usuário corrente para uso no passo "Vincular ativo" dos
// wizards de dívida. Retorna lista vazia quando não há usuário autenticado.
export async function listActiveAssetsForLinking(): Promise<ActiveAssetPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const repo = repos.assets;
  const assets = await repo.findActiveByUser(user.id);
  return assets.map((a) => ({
    id: a.id,
    label: a.label,
    category: a.category,
    currentValue: serializeMoney(a.currentValue),
  }));
}
