"use server";

import type { Currency } from "@/domain/value-objects/money.vo";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export interface CashAccountOption {
  id: string;
  label: string;
  currency: Currency;
}

export async function listCashAccounts(): Promise<CashAccountOption[]> {
  const user = await requireUser();
  const repo = repos.assets;
  const assets = await repo.findActiveByUserAndCategory(user.id, "cash");
  return assets.map((a) => ({ id: a.id, label: a.label, currency: a.currentValue.currency }));
}
