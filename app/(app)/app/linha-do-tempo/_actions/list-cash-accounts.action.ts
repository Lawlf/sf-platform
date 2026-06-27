"use server";

import type { Currency } from "@/domain/value-objects/money.vo";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export interface CashAccountOption {
  id: string;
  label: string;
  currency: Currency;
  /** Reserva (guardado) vs livre (dia a dia). Etiqueta, não tipo estrutural. */
  isReserve: boolean;
  /** Carteira-base: o saldo livre acumulado onde os lançamentos caem por padrão. */
  isBase: boolean;
}

export async function listCashAccounts(): Promise<CashAccountOption[]> {
  await requireUser();
  const profileId = await getActiveProfileId();
  const repo = repos.assets;
  const assets = await repo.findActiveByProfileAndCategory(profileId, "cash");
  return assets.map((a) => ({
    id: a.id,
    label: a.label,
    currency: a.currentValue.currency,
    isReserve:
      a.metadata !== null && a.metadata.kind === "cash" && a.metadata.isReserve === true,
    isBase: a.label === "Carteira",
  }));
}
