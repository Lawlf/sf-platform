import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { AssetCategory, AssetEntity } from "@/domain/entities/asset.entity";
import { isAssetActive } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { AssetValuationService } from "@/domain/services/asset-valuation.service";
import { Money } from "@/domain/value-objects/money.vo";

/**
 * Quanto do saldo atual de uma dívida pertence ao ativo, dado o valor
 * originalmente alocado. Proporcional: outstanding = currentBalance *
 * (allocationOriginal / debtOriginalPrincipal). Usa aritmética com bigint
 * para evitar drift de ponto flutuante (truncamento pode perder até 1 cent
 * por alocação, aceitável para exibição).
 */
export function outstandingDebtOnAsset(
  allocationOriginal: Money,
  debtOriginalPrincipal: Money,
  debtCurrentBalance: Money,
): Money {
  const principalCents = debtOriginalPrincipal.toCents();
  if (principalCents === 0n) {
    return Money.fromCents(0n);
  }
  const allocCents = allocationOriginal.toCents();
  const balanceCents = debtCurrentBalance.toCents();
  const outstandingCents = (balanceCents * allocCents) / principalCents;
  return Money.fromCents(outstandingCents);
}

export interface AssetNetWorthInput {
  asset: AssetEntity;
  allocations: AssetDebtAllocation[];
  debtsById: Map<string, DebtEntity>;
  /**
   * Data de referência para calcular o valor depreciado do ativo. Quando
   * omitida, usa o `currentValue` cadastrado sem aplicar depreciação.
   */
  asOf?: Date;
}

/**
 * Patrimônio líquido de um único ativo: valor corrente (depreciado conforme
 * `asOf`, se fornecido) menos a soma dos `outstandingDebtOnAsset` para cada
 * dívida ativa vinculada. Dívidas com `status !== "active"` (paid_off,
 * written_off) são ignoradas.
 */
export function assetNetWorth({ asset, allocations, debtsById, asOf }: AssetNetWorthInput): Money {
  const totalDebtOnAsset = allocations.reduce<Money>((acc, alloc) => {
    const debt = debtsById.get(alloc.debtId);
    if (!debt) return acc;
    if (debt.status !== "active") return acc;
    const owed = outstandingDebtOnAsset(
      alloc.allocationOriginal,
      debt.originalPrincipal,
      debt.currentBalance,
    );
    return acc.add(owed);
  }, Money.fromCents(0n));
  const valueAtDate = asOf
    ? AssetValuationService.computeCurrentValue(asset, asOf)
    : asset.currentValue;
  return valueAtDate.subtract(totalDebtOnAsset);
}

export interface NetWorthByCategory {
  category: AssetCategory;
  totalValue: Money;
  netWorth: Money;
  assetCount: number;
}

export interface NetWorthSnapshot {
  totalAssets: Money;
  totalDebtBalance: Money;
  allocatedDebtBalance: Money;
  unallocatedDebtBalance: Money;
  netWorth: Money;
  byCategory: NetWorthByCategory[];
}

export interface ComputeNetWorthInput {
  activeAssets: AssetEntity[];
  allocationsByAsset: Map<string, AssetDebtAllocation[]>;
  activeDebts: DebtEntity[];
  /**
   * Data de referência para depreciação. Quando omitida, ativos não são
   * depreciados (usa-se `currentValue` cadastrado, comportamento legado).
   */
  asOf?: Date;
}

const ALL_CATEGORIES: AssetCategory[] = ["vehicle", "real_estate", "investment", "cash", "other"];

/**
 * Snapshot global de patrimônio: agrega ativos, dívidas (totais e alocadas)
 * e produz totais por categoria. O caller normalmente passa apenas ativos e
 * dívidas ativas, mas a função aplica `isAssetActive` por segurança nas
 * agregações por categoria.
 *
 * Quando `asOf` é fornecido, o valor de cada ativo é depreciado via
 * `AssetValuationService.computeCurrentValue(asset, asOf)` antes de entrar
 * nas somas. Sem `asOf`, mantém o comportamento legado de usar o
 * `currentValue` cadastrado sem depreciação.
 */
export function computeNetWorthSnapshot({
  activeAssets,
  allocationsByAsset,
  activeDebts,
  asOf,
}: ComputeNetWorthInput): NetWorthSnapshot {
  const debtsById = new Map<string, DebtEntity>(activeDebts.map((d) => [d.id, d] as const));

  const activeAssetsOnly = activeAssets.filter(isAssetActive);

  const valueOf = (a: AssetEntity): Money =>
    asOf ? AssetValuationService.computeCurrentValue(a, asOf) : a.currentValue;

  const totalAssets = activeAssetsOnly.reduce<Money>(
    (acc, a) => acc.add(valueOf(a)),
    Money.fromCents(0n),
  );

  const totalDebtBalance = activeDebts.reduce<Money>(
    (acc, d) => acc.add(d.currentBalance),
    Money.fromCents(0n),
  );

  const allocatedDebtBalance = activeAssetsOnly.reduce<Money>((acc, a) => {
    const allocations = allocationsByAsset.get(a.id) ?? [];
    const owedOnAsset = allocations.reduce<Money>((inner, alloc) => {
      const debt = debtsById.get(alloc.debtId);
      if (!debt) return inner;
      if (debt.status !== "active") return inner;
      return inner.add(
        outstandingDebtOnAsset(
          alloc.allocationOriginal,
          debt.originalPrincipal,
          debt.currentBalance,
        ),
      );
    }, Money.fromCents(0n));
    return acc.add(owedOnAsset);
  }, Money.fromCents(0n));

  const unallocatedDebtBalance = totalDebtBalance.subtract(allocatedDebtBalance);
  const netWorth = totalAssets.subtract(totalDebtBalance);

  const byCategory: NetWorthByCategory[] = ALL_CATEGORIES.map((cat) => {
    const inCat = activeAssetsOnly.filter((a) => a.category === cat);
    const totalValue = inCat.reduce<Money>((acc, a) => acc.add(valueOf(a)), Money.fromCents(0n));
    const catNetWorth = inCat.reduce<Money>((acc, a) => {
      return acc.add(
        assetNetWorth({
          asset: a,
          allocations: allocationsByAsset.get(a.id) ?? [],
          debtsById,
          ...(asOf ? { asOf } : {}),
        }),
      );
    }, Money.fromCents(0n));
    return {
      category: cat,
      totalValue,
      netWorth: catNetWorth,
      assetCount: inCat.length,
    };
  });

  return {
    totalAssets,
    totalDebtBalance,
    allocatedDebtBalance,
    unallocatedDebtBalance,
    netWorth,
    byCategory,
  };
}
