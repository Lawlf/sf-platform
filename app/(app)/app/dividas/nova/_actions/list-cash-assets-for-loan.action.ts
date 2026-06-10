"use server";

import { repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { serializeMoney, type SerializedMoney } from "../../../_actions/_serialize";

export interface CashAssetForLoanPayload {
  id: string;
  label: string;
  currentValue: SerializedMoney;
}

/**
 * Lista os ativos de categoria "cash" ativos do usuario para uso no passo
 * "Esse dinheiro caiu numa conta?" do wizard de emprestimo.
 * Retorna lista vazia quando nao ha usuario autenticado.
 */
export async function listCashAssetsForLoan(): Promise<CashAssetForLoanPayload[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const repo = repos.assets;
  const assets = await repo.findActiveByUserAndCategory(user.id, "cash");
  return assets.map((a) => ({
    id: a.id,
    label: a.label,
    currentValue: serializeMoney(a.currentValue),
  }));
}
