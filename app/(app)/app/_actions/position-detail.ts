"use server";

import type { AssetCategory } from "@/domain/entities/asset.entity";
import type { DebtEntity, DebtKind } from "@/domain/entities/debt.entity";
import { assetNetWorth } from "@/domain/services/patrimony.service";
import { Money } from "@/domain/value-objects/money.vo";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export interface SerializedAssetRow {
  id: string;
  category: AssetCategory;
  label: string;
  value: SerializedMoney;
  netWorthOnAsset: SerializedMoney;
}

export interface SerializedDebtRow {
  id: string;
  kind: DebtKind;
  label: string;
  currentBalance: SerializedMoney;
}

export interface SerializedPositionDetail {
  totalAssets: SerializedMoney;
  totalDebts: SerializedMoney;
  netWorth: SerializedMoney;
  netWorthIsNegative: boolean;
  assets: SerializedAssetRow[];
  debts: SerializedDebtRow[];
}

export async function fetchPositionDetail(): Promise<SerializedPositionDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const assetsRepo = new DrizzleAssetRepository();
  const debtsRepo = new DrizzleDebtRepository();

  const [assetsWithAllocs, activeDebts] = await Promise.all([
    assetsRepo.findActiveWithAllocations(user.id),
    debtsRepo.listForUser(user.id, { status: "active" }),
  ]);

  const debtsById = new Map<string, DebtEntity>(activeDebts.map((d) => [d.id, d]));

  let totalAssetsCents = 0n;
  const assetRows: SerializedAssetRow[] = assetsWithAllocs.map(({ asset, allocations }) => {
    const nw = assetNetWorth({ asset, allocations, debtsById });
    totalAssetsCents += asset.currentValue.toCents();
    return {
      id: asset.id,
      category: asset.category,
      label: asset.label,
      value: serializeMoney(asset.currentValue),
      netWorthOnAsset: serializeMoney(nw),
    };
  });

  let totalDebtsCents = 0n;
  const debtRows: SerializedDebtRow[] = activeDebts.map((d) => {
    totalDebtsCents += d.currentBalance.toCents();
    return {
      id: d.id,
      kind: d.kind,
      label: d.label,
      currentBalance: serializeMoney(d.currentBalance),
    };
  });

  const totalAssetsMoney = Money.fromCents(totalAssetsCents);
  const totalDebtsMoney = Money.fromCents(totalDebtsCents);
  const netWorthCents = totalAssetsCents - totalDebtsCents;
  const netWorthMoney = Money.fromCents(netWorthCents);

  return {
    totalAssets: serializeMoney(totalAssetsMoney),
    totalDebts: serializeMoney(totalDebtsMoney),
    netWorth: serializeMoney(netWorthMoney),
    netWorthIsNegative: netWorthCents < 0n,
    assets: assetRows,
    debts: debtRows,
  };
}
