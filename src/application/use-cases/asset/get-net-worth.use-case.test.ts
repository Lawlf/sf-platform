import { describe, expect, it, vi } from "vitest";

import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { AssetCategory, AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtStatus, FinancingDebt } from "@/domain/entities/debt.entity";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepository } from "@/domain/ports/repositories/exchange-rate.repository";
import type { UserFxOverrideRepository } from "@/domain/ports/repositories/user-fx-override.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money, type Currency } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { getNetWorth } from "./get-net-worth.use-case";

const NOW = new Date("2026-05-19T10:00:00Z");

function rateAnnual(value: number): InterestRate {
  const r = InterestRate.fromAnnual(value);
  if (!isOk(r)) throw new Error("rate setup failed");
  return r.value;
}

function makeAsset(
  overrides: Partial<AssetEntity> & {
    id: string;
    currentValueCents: bigint;
    currency?: Currency;
  },
): AssetEntity {
  return {
    id: overrides.id,
    userId: overrides.userId ?? "user-1",
    category: overrides.category ?? "vehicle",
    label: overrides.label ?? "Test asset",
    currentValue: Money.fromCents(overrides.currentValueCents, overrides.currency ?? "BRL"),
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
    anchorAt: overrides.anchorAt ?? null,
    deactivatedAt: overrides.deactivatedAt ?? null,
    deactivationKind: overrides.deactivationKind ?? null,
    salePriceCents: overrides.salePriceCents ?? null,
    deactivationReason: overrides.deactivationReason ?? null,
    externalAccountKey: overrides.externalAccountKey ?? null,
    deletedAt: overrides.deletedAt ?? null,
  };
}

function makeFinancing({
  id,
  originalPrincipalCents,
  currentBalanceCents,
  status = "active",
  userId = "user-1",
  currency = "BRL",
}: {
  id: string;
  originalPrincipalCents: bigint;
  currentBalanceCents: bigint;
  status?: DebtStatus;
  userId?: string;
  currency?: Currency;
}): FinancingDebt {
  return {
    id,
    userId,
    kind: "financing",
    label: "Financiamento",
    status,
    originalPrincipal: Money.fromCents(originalPrincipalCents, currency),
    currentBalance: Money.fromCents(currentBalanceCents, currency),
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

function makeAllocation(
  assetId: string,
  debtId: string,
  cents: bigint,
  currency: Currency = "BRL",
): AssetDebtAllocation {
  return {
    id: `alloc-${assetId}-${debtId}`,
    assetId,
    debtId,
    allocationOriginal: Money.fromCents(cents, currency),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

interface BuildDepsOptions {
  assets: AssetEntity[];
  debts: FinancingDebt[];
  allocationsByAsset: Map<string, AssetDebtAllocation[]>;
  rate?: string | null;
}

function buildDeps({ assets, debts, allocationsByAsset, rate = null }: BuildDepsOptions) {
  const assetRepo: AssetRepository = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByUser: vi.fn(async (userId: string) =>
      assets.filter((a) => a.userId === userId && a.deactivatedAt === null && a.deletedAt === null),
    ),
    createDefaultWallet: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };

  const allocationRepo: AssetDebtAllocationRepository = {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(async (assetId: string) => allocationsByAsset.get(assetId) ?? []),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(),
  };

  const debtRepo: DebtRepository = {
    findById: vi.fn(),
    listForUser: vi.fn(async (userId: string, opts?: { status?: DebtStatus | "all" }) => {
      const ofUser = debts.filter((d) => d.userId === userId);
      const status = opts?.status;
      if (!status || status === "all") return ofUser;
      return ofUser.filter((d) => d.status === status);
    }),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
  };

  const rates: ExchangeRateRepository = {
    upsertDaily: vi.fn(),
    findLatest: vi.fn(async () =>
      rate ? ({ rateDecimal: rate, asOf: NOW } as never) : null,
    ),
  };
  const overrides: UserFxOverrideRepository = {
    find: vi.fn(async () => null),
    upsert: vi.fn(),
    remove: vi.fn(),
    listForUser: vi.fn(async () => []),
  };
  const clock = { now: vi.fn(() => NOW) };

  return {
    assets: assetRepo,
    allocations: allocationRepo,
    debts: debtRepo,
    rates,
    overrides,
    clock,
  };
}

describe("getNetWorth", () => {
  it("retorna snapshot zerado quando nao ha ativos nem dividas", async () => {
    const deps = buildDeps({
      assets: [],
      debts: [],
      allocationsByAsset: new Map(),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalAssets.toCents()).toBe(0n);
      expect(result.value.totalDebtBalance.toCents()).toBe(0n);
      expect(result.value.allocatedDebtBalance.toCents()).toBe(0n);
      expect(result.value.unallocatedDebtBalance.toCents()).toBe(0n);
      expect(result.value.netWorth.toCents()).toBe(0n);
      for (const cat of result.value.byCategory) {
        expect(cat.assetCount).toBe(0);
        expect(cat.totalValue.toCents()).toBe(0n);
        expect(cat.netWorth.toCents()).toBe(0n);
      }
    }
  });

  it("ativo sem dividas: netWorth == currentValue", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const deps = buildDeps({
      assets: [asset],
      debts: [],
      allocationsByAsset: new Map(),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalAssets.toCents()).toBe(5_000_000n);
      expect(result.value.netWorth.toCents()).toBe(5_000_000n);
    }
  });

  it("ativo com divida 100% alocada: netWorth = currentValue - currentBalance", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const debt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 4_000_000n,
      currentBalanceCents: 3_000_000n,
    });
    const alloc = makeAllocation("a1", "d1", 4_000_000n);
    const deps = buildDeps({
      assets: [asset],
      debts: [debt],
      allocationsByAsset: new Map([["a1", [alloc]]]),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalAssets.toCents()).toBe(5_000_000n);
      expect(result.value.totalDebtBalance.toCents()).toBe(3_000_000n);
      expect(result.value.allocatedDebtBalance.toCents()).toBe(3_000_000n);
      expect(result.value.unallocatedDebtBalance.toCents()).toBe(0n);
      expect(result.value.netWorth.toCents()).toBe(2_000_000n);
    }
  });

  it("ativo com alocacao parcial (R$30k em principal R$50k, saldo R$30k): outstanding R$18k", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 3_000_000n });
    const debt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 5_000_000n,
      currentBalanceCents: 3_000_000n,
    });
    const alloc = makeAllocation("a1", "d1", 3_000_000n);
    const deps = buildDeps({
      assets: [asset],
      debts: [debt],
      allocationsByAsset: new Map([["a1", [alloc]]]),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.allocatedDebtBalance.toCents()).toBe(1_800_000n);
      // unallocated = totalDebtBalance (3M) - allocated (1.8M) = 1.2M
      expect(result.value.unallocatedDebtBalance.toCents()).toBe(1_200_000n);
      // netWorth = 3M assets - 3M total debt = 0
      expect(result.value.netWorth.toCents()).toBe(0n);
    }
  });

  it("ativo com multiplas dividas: soma outstandings", async () => {
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
    const deps = buildDeps({
      assets: [asset],
      debts: [debt1, debt2],
      allocationsByAsset: new Map([["a1", allocs]]),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // outstandings = 1_000_000 + 500_000 = 1_500_000
      expect(result.value.allocatedDebtBalance.toCents()).toBe(1_500_000n);
      expect(result.value.totalDebtBalance.toCents()).toBe(1_500_000n);
      expect(result.value.unallocatedDebtBalance.toCents()).toBe(0n);
      expect(result.value.netWorth.toCents()).toBe(3_500_000n);
    }
  });

  it("divida paid_off nao entra no total (listForUser filtra por status active)", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const active = makeFinancing({
      id: "d1",
      originalPrincipalCents: 1_000_000n,
      currentBalanceCents: 800_000n,
    });
    const paidOff = makeFinancing({
      id: "d2",
      originalPrincipalCents: 2_000_000n,
      currentBalanceCents: 0n,
      status: "paid_off",
    });
    const deps = buildDeps({
      assets: [asset],
      debts: [active, paidOff],
      allocationsByAsset: new Map(),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalDebtBalance.toCents()).toBe(800_000n);
      expect(result.value.netWorth.toCents()).toBe(4_200_000n);
    }
  });

  it("divida written_off (fora do mes) ENTRA no total que se deve", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const active = makeFinancing({
      id: "d1",
      originalPrincipalCents: 1_000_000n,
      currentBalanceCents: 800_000n,
    });
    const outOfMonth = makeFinancing({
      id: "d2",
      originalPrincipalCents: 2_000_000n,
      currentBalanceCents: 1_500_000n,
      status: "written_off",
    });
    const deps = buildDeps({
      assets: [asset],
      debts: [active, outOfMonth],
      allocationsByAsset: new Map(),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // 800k ativa + 1.5M fora do mes = 2.3M no total que se deve
      expect(result.value.totalDebtBalance.toCents()).toBe(2_300_000n);
      // net worth = 5M ativos - 2.3M divida = 2.7M
      expect(result.value.netWorth.toCents()).toBe(2_700_000n);
    }
  });

  it("ativo desativado nao entra no snapshot (findActiveByUser filtra)", async () => {
    const active = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const dead = makeAsset({
      id: "a2",
      currentValueCents: 3_000_000n,
      deactivatedAt: new Date("2026-01-01"),
      deactivationReason: "Vendido",
    });
    const deps = buildDeps({
      assets: [active, dead],
      debts: [],
      allocationsByAsset: new Map(),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalAssets.toCents()).toBe(5_000_000n);
      const vehicle = result.value.byCategory.find((c) => c.category === "vehicle");
      expect(vehicle?.assetCount).toBe(1);
      expect(vehicle?.totalValue.toCents()).toBe(5_000_000n);
    }
  });

  it("agrega por categoria com 5 baldes (vehicle, real_estate, investment, cash, other)", async () => {
    const car = makeAsset({
      id: "a1",
      currentValueCents: 5_000_000n,
      category: "vehicle",
    });
    const house = makeAsset({
      id: "a2",
      currentValueCents: 50_000_000n,
      category: "real_estate",
    });
    const fund = makeAsset({
      id: "a3",
      currentValueCents: 10_000_000n,
      category: "investment",
    });
    const deps = buildDeps({
      assets: [car, house, fund],
      debts: [],
      allocationsByAsset: new Map(),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const byCat = new Map<AssetCategory, { count: number; value: bigint }>(
        result.value.byCategory.map((c) => [
          c.category,
          { count: c.assetCount, value: c.totalValue.toCents() },
        ]),
      );
      expect(byCat.get("vehicle")).toEqual({ count: 1, value: 5_000_000n });
      expect(byCat.get("real_estate")).toEqual({ count: 1, value: 50_000_000n });
      expect(byCat.get("investment")).toEqual({ count: 1, value: 10_000_000n });
      expect(byCat.get("cash")).toEqual({ count: 0, value: 0n });
      expect(byCat.get("other")).toEqual({ count: 0, value: 0n });
      expect(result.value.byCategory).toHaveLength(5);
    }
  });

  it("divida nao alocada produz unallocatedDebtBalance > 0", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const allocatedDebt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 4_000_000n,
      currentBalanceCents: 3_000_000n,
    });
    const freeDebt = makeFinancing({
      id: "d2",
      originalPrincipalCents: 1_000_000n,
      currentBalanceCents: 500_000n,
    });
    const alloc = makeAllocation("a1", "d1", 4_000_000n);
    const deps = buildDeps({
      assets: [asset],
      debts: [allocatedDebt, freeDebt],
      allocationsByAsset: new Map([["a1", [alloc]]]),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalDebtBalance.toCents()).toBe(3_500_000n);
      expect(result.value.allocatedDebtBalance.toCents()).toBe(3_000_000n);
      expect(result.value.unallocatedDebtBalance.toCents()).toBe(500_000n);
      expect(result.value.netWorth.toCents()).toBe(1_500_000n);
    }
  });

  it("escopa por usuario: ativos e dividas de outros nao entram", async () => {
    const mine = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const theirs = makeAsset({
      id: "a2",
      currentValueCents: 9_000_000n,
      userId: "other",
    });
    const myDebt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 1_000_000n,
      currentBalanceCents: 800_000n,
    });
    const theirDebt = makeFinancing({
      id: "d2",
      originalPrincipalCents: 2_000_000n,
      currentBalanceCents: 1_500_000n,
      userId: "other",
    });
    const deps = buildDeps({
      assets: [mine, theirs],
      debts: [myDebt, theirDebt],
      allocationsByAsset: new Map(),
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalAssets.toCents()).toBe(5_000_000n);
      expect(result.value.totalDebtBalance.toCents()).toBe(800_000n);
    }
  });

  it("ativo em USD converte para BRL com a taxa resolvida (5.00)", async () => {
    const usd = makeAsset({ id: "a1", currentValueCents: 10_000n, currency: "USD" });
    const deps = buildDeps({
      assets: [usd],
      debts: [],
      allocationsByAsset: new Map(),
      rate: "5.00",
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalAssets.toCents()).toBe(50_000n);
      expect(result.value.netWorth.toCents()).toBe(50_000n);
    }
  });

  it("divida em USD alocada converte allocationOriginal junto (taxa 5.00)", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const debt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 4_000n,
      currentBalanceCents: 3_000n,
      currency: "USD",
    });
    const alloc = makeAllocation("a1", "d1", 4_000n, "USD");
    const deps = buildDeps({
      assets: [asset],
      debts: [debt],
      allocationsByAsset: new Map([["a1", [alloc]]]),
      rate: "5.00",
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.totalDebtBalance.toCents()).toBe(15_000n);
      expect(result.value.allocatedDebtBalance.toCents()).toBe(15_000n);
      expect(result.value.unallocatedDebtBalance.toCents()).toBe(0n);
      expect(result.value.netWorth.toCents()).toBe(4_985_000n);
    }
  });

  it("ativo em USD sem taxa disponivel retorna isErr", async () => {
    const usd = makeAsset({ id: "a1", currentValueCents: 10_000n, currency: "USD" });
    const deps = buildDeps({
      assets: [usd],
      debts: [],
      allocationsByAsset: new Map(),
      rate: null,
    });

    const result = await getNetWorth(deps, { userId: "user-1" });

    expect(isErr(result)).toBe(true);
  });
});
