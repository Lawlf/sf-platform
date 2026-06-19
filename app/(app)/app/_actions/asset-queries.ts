"use server";

import { getNetWorth } from "@/application/use-cases/asset/get-net-worth.use-case";
import type { AssetCategory } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { assetNetWorth } from "@/domain/services/patrimony.service";
import { clock, repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { isOk } from "@/shared/errors/result";

import { serializeMoney, type SerializedMoney } from "./_serialize";

async function authedUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export interface NetWorthCategoryPayload {
  category: AssetCategory;
  totalValue: SerializedMoney;
  netWorth: SerializedMoney;
  assetCount: number;
}

export interface NetWorthPayload {
  totalAssets: SerializedMoney;
  totalDebtBalance: SerializedMoney;
  netWorth: SerializedMoney;
  netWorthIsNegative: boolean;
  totalAssetCount: number;
  byCategory: NetWorthCategoryPayload[];
}

export async function fetchNetWorth(): Promise<NetWorthPayload | null> {
  const userId = await authedUserId();
  if (!userId) return null;
  const profileId = await getActiveProfileId();
  const result = await getNetWorth(
    {
      assets: repos.assets,
      allocations: repos.assetDebtAllocations,
      debts: repos.debts,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
      clock,
    },
    { userId, profileId },
  );
  if (!isOk(result)) return null;
  const s = result.value;
  const totalAssetCount = s.byCategory.reduce((acc, c) => acc + c.assetCount, 0);
  return {
    totalAssets: serializeMoney(s.totalAssets),
    totalDebtBalance: serializeMoney(s.totalDebtBalance),
    netWorth: serializeMoney(s.netWorth),
    netWorthIsNegative: s.netWorth.isNegative(),
    totalAssetCount,
    byCategory: s.byCategory.map((c) => ({
      category: c.category,
      totalValue: serializeMoney(c.totalValue),
      netWorth: serializeMoney(c.netWorth),
      assetCount: c.assetCount,
    })),
  };
}

export interface AssetWithNetWorthPayload {
  id: string;
  category: AssetCategory;
  label: string;
  valueFormatted: string;
  netWorthFormatted: string;
  netWorthIsNegative: boolean;
}

export async function fetchAssetsWithAllocations(): Promise<AssetWithNetWorthPayload[]> {
  const userId = await authedUserId();
  if (!userId) return [];
  const profileId = await getActiveProfileId();
  const assetsRepo = repos.assets;
  const debtsRepo = repos.debts;

  const assetsWithAllocs = await assetsRepo.findActiveWithAllocations(profileId);
  const activeDebts = await debtsRepo.listForProfile(profileId, { status: "active" });
  const debtsById = new Map<string, DebtEntity>(activeDebts.map((d) => [d.id, d]));

  return assetsWithAllocs
    // A Carteira não entra na lista de bens: ela é o card próprio no topo. O
    // valor dela continua no patrimônio total (fetchNetWorth soma tudo).
    .filter(({ asset }) => !(asset.category === "cash" && asset.label === "Carteira"))
    .map(({ asset, allocations }) => {
      const nw = assetNetWorth({ asset, allocations, debtsById });
      return {
        id: asset.id,
        category: asset.category,
        label: asset.label,
      valueFormatted: asset.currentValue.format(),
      netWorthFormatted: nw.format(),
      netWorthIsNegative: nw.isNegative(),
    };
  });
}
