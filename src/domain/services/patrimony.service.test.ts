import { describe, expect, it } from "vitest";

import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity, FinancingDebt } from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import {
  assetNetWorth,
  computeNetWorthSnapshot,
  outstandingDebtOnAsset,
} from "./patrimony.service";

function rateAnnual(value: number): InterestRate {
  const r = InterestRate.fromAnnual(value);
  if (!isOk(r)) throw new Error("rate setup failed");
  return r.value;
}

function makeAsset(
  overrides: Partial<AssetEntity> & { id: string; currentValueCents: bigint },
): AssetEntity {
  return {
    id: overrides.id,
    userId: overrides.userId ?? "user-1",
    category: overrides.category ?? "vehicle",
    label: overrides.label ?? "Test asset",
    currentValue: Money.fromCents(overrides.currentValueCents),
    metadata: overrides.metadata ?? null,
    fipeCode: overrides.fipeCode ?? null,
    fipeLastSyncedAt: overrides.fipeLastSyncedAt ?? null,
    acquiredAt: overrides.acquiredAt ?? null,
    depreciationKind: overrides.depreciationKind ?? "stable",
    depreciationRatePctYear: overrides.depreciationRatePctYear ?? 0,
    purchaseDate: overrides.purchaseDate ?? null,
    purchasePriceCents: overrides.purchasePriceCents ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01"),
    deactivatedAt: overrides.deactivatedAt ?? null,
    deactivationKind: overrides.deactivationKind ?? null,
    salePriceCents: overrides.salePriceCents ?? null,
    deactivationReason: overrides.deactivationReason ?? null,
    deletedAt: overrides.deletedAt ?? null,
  };
}

function makeFinancing({
  id,
  originalPrincipalCents,
  currentBalanceCents,
  status = "active",
}: {
  id: string;
  originalPrincipalCents: bigint;
  currentBalanceCents: bigint;
  status?: DebtEntity["status"];
}): FinancingDebt {
  return {
    id,
    userId: "user-1",
    kind: "financing",
    label: "Financiamento",
    status,
    originalPrincipal: Money.fromCents(originalPrincipalCents),
    currentBalance: Money.fromCents(currentBalanceCents),
    startDate: new Date("2024-01-01"),
    expectedEndDate: null,
    notes: null,
    amortizationMethod: "PRICE",
    annualInterestRate: rateAnnual(0.1),
    termMonths: 360,
    monthlyInsurance: null,
    monthlyAdminFee: null,
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

function makeAllocation(assetId: string, debtId: string, cents: bigint): AssetDebtAllocation {
  return {
    id: `alloc-${assetId}-${debtId}`,
    assetId,
    debtId,
    allocationOriginal: Money.fromCents(cents),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

describe("outstandingDebtOnAsset", () => {
  it("retorna zero quando o principal original é zero", () => {
    const out = outstandingDebtOnAsset(
      Money.fromCents(1000n),
      Money.fromCents(0n),
      Money.fromCents(500n),
    );
    expect(out.toCents()).toBe(0n);
  });

  it("computa outstanding proporcional (alocação parcial)", () => {
    // alocou R$30k de um principal de R$50k, saldo atual R$30k.
    // outstanding = 30k * (30k / 50k) = R$18k.
    const out = outstandingDebtOnAsset(
      Money.fromCents(3_000_000n),
      Money.fromCents(5_000_000n),
      Money.fromCents(3_000_000n),
    );
    expect(out.toCents()).toBe(1_800_000n);
  });

  it("retorna o saldo total quando alocação == principal", () => {
    const out = outstandingDebtOnAsset(
      Money.fromCents(5_000_000n),
      Money.fromCents(5_000_000n),
      Money.fromCents(3_000_000n),
    );
    expect(out.toCents()).toBe(3_000_000n);
  });

  it("retorna zero quando o saldo atual é zero (dívida quitada)", () => {
    const out = outstandingDebtOnAsset(
      Money.fromCents(4_000_000n),
      Money.fromCents(4_000_000n),
      Money.fromCents(0n),
    );
    expect(out.toCents()).toBe(0n);
  });
});

describe("assetNetWorth", () => {
  it("ativo sem dívidas vinculadas: netWorth == currentValue", () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const nw = assetNetWorth({ asset, allocations: [], debtsById: new Map() });
    expect(nw.toCents()).toBe(5_000_000n);
  });

  it("ativo com 1 dívida 100% alocada: netWorth = currentValue - currentBalance", () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const debt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 4_000_000n,
      currentBalanceCents: 3_000_000n,
    });
    const alloc = makeAllocation("a1", "d1", 4_000_000n);
    const nw = assetNetWorth({
      asset,
      allocations: [alloc],
      debtsById: new Map<string, DebtEntity>([[debt.id, debt]]),
    });
    expect(nw.toCents()).toBe(2_000_000n);
  });

  it("ativo com alocação parcial: outstanding proporcional", () => {
    // Empréstimo R$50k principal, R$30k alocado no carro, saldo atual R$30k.
    // outstanding no carro = 30k * (30k/50k) = R$18k.
    // Carro vale R$30k => netWorth = 30k - 18k = R$12k.
    const asset = makeAsset({ id: "a1", currentValueCents: 3_000_000n });
    const debt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 5_000_000n,
      currentBalanceCents: 3_000_000n,
    });
    const alloc = makeAllocation("a1", "d1", 3_000_000n);
    const nw = assetNetWorth({
      asset,
      allocations: [alloc],
      debtsById: new Map<string, DebtEntity>([[debt.id, debt]]),
    });
    expect(nw.toCents()).toBe(1_200_000n);
  });

  it("ignora dívida com status paid_off", () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const debt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 4_000_000n,
      currentBalanceCents: 0n,
      status: "paid_off",
    });
    const alloc = makeAllocation("a1", "d1", 4_000_000n);
    const nw = assetNetWorth({
      asset,
      allocations: [alloc],
      debtsById: new Map<string, DebtEntity>([[debt.id, debt]]),
    });
    expect(nw.toCents()).toBe(5_000_000n);
  });

  it("ignora dívida com status written_off", () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const debt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 4_000_000n,
      currentBalanceCents: 2_000_000n,
      status: "written_off",
    });
    const alloc = makeAllocation("a1", "d1", 4_000_000n);
    const nw = assetNetWorth({
      asset,
      allocations: [alloc],
      debtsById: new Map<string, DebtEntity>([[debt.id, debt]]),
    });
    expect(nw.toCents()).toBe(5_000_000n);
  });

  it("soma outstanding entre múltiplas dívidas", () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const debt1 = makeFinancing({
      id: "d1",
      originalPrincipalCents: 2_000_000n,
      currentBalanceCents: 1_000_000n,
    });
    const debt2 = makeFinancing({
      id: "d2",
      originalPrincipalCents: 2_000_000n,
      currentBalanceCents: 500_000n,
    });
    const allocs = [makeAllocation("a1", "d1", 2_000_000n), makeAllocation("a1", "d2", 2_000_000n)];
    const debtsById = new Map<string, DebtEntity>([
      [debt1.id, debt1],
      [debt2.id, debt2],
    ]);
    const nw = assetNetWorth({ asset, allocations: allocs, debtsById });
    expect(nw.toCents()).toBe(3_500_000n);
  });

  it("ignora alocação cuja dívida não está no mapa (dívida ausente)", () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const alloc = makeAllocation("a1", "d-missing", 1_000_000n);
    const nw = assetNetWorth({
      asset,
      allocations: [alloc],
      debtsById: new Map<string, DebtEntity>(),
    });
    expect(nw.toCents()).toBe(5_000_000n);
  });
});

describe("computeNetWorthSnapshot", () => {
  it("ignora ativos desativados nas totalizações e nas categorias", () => {
    const active = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const dead = makeAsset({
      id: "a2",
      currentValueCents: 3_000_000n,
      deactivatedAt: new Date("2026-01-01"),
      deactivationReason: "Vendido",
    });
    const snap = computeNetWorthSnapshot({
      activeAssets: [active, dead],
      allocationsByAsset: new Map(),
      activeDebts: [],
    });
    expect(snap.totalAssets.toCents()).toBe(5_000_000n);
    const cat = snap.byCategory.find((c) => c.category === "vehicle");
    expect(cat).toBeDefined();
    expect(cat?.assetCount).toBe(1);
    expect(cat?.totalValue.toCents()).toBe(5_000_000n);
  });

  it("agrega por categoria com 5 baldes", () => {
    const car = makeAsset({ id: "a1", currentValueCents: 5_000_000n, category: "vehicle" });
    const house = makeAsset({
      id: "a2",
      currentValueCents: 50_000_000n,
      category: "real_estate",
    });
    const reserve = makeAsset({
      id: "a3",
      currentValueCents: 2_000_000n,
      category: "cash",
    });
    const snap = computeNetWorthSnapshot({
      activeAssets: [car, house, reserve],
      allocationsByAsset: new Map(),
      activeDebts: [],
    });
    expect(snap.byCategory).toHaveLength(5);
    const cat1 = snap.byCategory.find((c) => c.category === "vehicle");
    const cat2 = snap.byCategory.find((c) => c.category === "real_estate");
    const cat3 = snap.byCategory.find((c) => c.category === "investment");
    const cat4 = snap.byCategory.find((c) => c.category === "cash");
    expect(cat1?.assetCount).toBe(1);
    expect(cat1?.totalValue.toCents()).toBe(5_000_000n);
    expect(cat2?.assetCount).toBe(1);
    expect(cat2?.totalValue.toCents()).toBe(50_000_000n);
    expect(cat3?.assetCount).toBe(0);
    expect(cat3?.totalValue.toCents()).toBe(0n);
    expect(cat4?.assetCount).toBe(1);
    expect(cat4?.totalValue.toCents()).toBe(2_000_000n);
    expect(snap.totalAssets.toCents()).toBe(57_000_000n);
  });

  it("computa netWorth e separa dívida alocada da não alocada", () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const debtAlloc = makeFinancing({
      id: "d1",
      originalPrincipalCents: 4_000_000n,
      currentBalanceCents: 3_000_000n,
    });
    const debtFree = makeFinancing({
      id: "d2",
      originalPrincipalCents: 1_000_000n,
      currentBalanceCents: 500_000n,
    });
    const alloc = makeAllocation("a1", "d1", 4_000_000n);
    const snap = computeNetWorthSnapshot({
      activeAssets: [asset],
      allocationsByAsset: new Map([["a1", [alloc]]]),
      activeDebts: [debtAlloc, debtFree],
    });
    expect(snap.totalAssets.toCents()).toBe(5_000_000n);
    expect(snap.totalDebtBalance.toCents()).toBe(3_500_000n);
    expect(snap.allocatedDebtBalance.toCents()).toBe(3_000_000n);
    expect(snap.unallocatedDebtBalance.toCents()).toBe(500_000n);
    expect(snap.netWorth.toCents()).toBe(1_500_000n);
  });

  it("netWorth pode ser negativo quando dívida total > patrimônio", () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 1_000_000n });
    const debt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 5_000_000n,
      currentBalanceCents: 4_000_000n,
    });
    const snap = computeNetWorthSnapshot({
      activeAssets: [asset],
      allocationsByAsset: new Map(),
      activeDebts: [debt],
    });
    expect(snap.netWorth.toCents()).toBe(-3_000_000n);
    expect(snap.netWorth.isNegative()).toBe(true);
  });
});
