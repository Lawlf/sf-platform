import { describe, expect, it, vi } from "vitest";

import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtStatus, FinancingDebt } from "@/domain/entities/debt.entity";
import { AssetNotFound } from "@/domain/errors/asset-errors";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type {
  AssetRepository,
  AssetWithAllocations,
} from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors";

import { getAssetDetail } from "./get-asset-detail.use-case";

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
  status?: DebtStatus;
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

interface BuildDepsOptions {
  withAllocations: AssetWithAllocations | null;
  debtsById: Map<string, FinancingDebt>;
}

function buildDeps({ withAllocations, debtsById }: BuildDepsOptions) {
  const assetRepo: AssetRepository = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByUser: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(async () => withAllocations),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
  };

  const allocationRepo: AssetDebtAllocationRepository = {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(),
  };

  const debtRepo: DebtRepository = {
    findById: vi.fn(async (id: string) => debtsById.get(id) ?? null),
    listForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
  };

  return { assets: assetRepo, allocations: allocationRepo, debts: debtRepo };
}

describe("getAssetDetail", () => {
  it("retorna AssetNotFound quando o ativo nao existe", async () => {
    const deps = buildDeps({ withAllocations: null, debtsById: new Map() });

    const result = await getAssetDetail(deps, {
      userId: "user-1",
      assetId: "missing",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
    expect(deps.assets.findByIdWithAllocations).toHaveBeenCalledWith("missing", "user-1");
  });

  it("retorna AssetNotFound quando o ativo pertence a outro usuario", async () => {
    // findByIdWithAllocations ja escopeia por userId. Repos devolvem null
    // se o ativo nao pertencer ao usuario; o use case deve refletir isso.
    const deps = buildDeps({ withAllocations: null, debtsById: new Map() });

    const result = await getAssetDetail(deps, {
      userId: "intruder",
      assetId: "asset-1",
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
  });

  it("happy path sem alocacoes: linkedDebts vazio e netWorth == currentValue", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const deps = buildDeps({
      withAllocations: { asset, allocations: [] },
      debtsById: new Map(),
    });

    const result = await getAssetDetail(deps, {
      userId: "user-1",
      assetId: "a1",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.asset.id).toBe("a1");
      expect(result.value.linkedDebts).toHaveLength(0);
      expect(result.value.netWorth.toCents()).toBe(5_000_000n);
    }
    expect(deps.debts.findById).not.toHaveBeenCalled();
  });

  it("happy path com alocacao parcial: outstandingOnAsset proporcional e netWorth correto", async () => {
    // Carro vale R$30k. Empréstimo R$50k principal, R$30k alocado, saldo R$30k.
    // outstanding no carro = 30k * (30k/50k) = R$18k.
    // netWorth = 30k - 18k = R$12k.
    const asset = makeAsset({ id: "a1", currentValueCents: 3_000_000n });
    const debt = makeFinancing({
      id: "d1",
      originalPrincipalCents: 5_000_000n,
      currentBalanceCents: 3_000_000n,
    });
    const alloc = makeAllocation("a1", "d1", 3_000_000n);
    const deps = buildDeps({
      withAllocations: { asset, allocations: [alloc] },
      debtsById: new Map([[debt.id, debt]]),
    });

    const result = await getAssetDetail(deps, {
      userId: "user-1",
      assetId: "a1",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.linkedDebts).toHaveLength(1);
      const linked = result.value.linkedDebts[0];
      if (!linked) throw new Error("expected linkedDebts[0]");
      expect(linked.debt.id).toBe("d1");
      expect(linked.allocationOriginal.toCents()).toBe(3_000_000n);
      expect(linked.outstandingOnAsset.toCents()).toBe(1_800_000n);
      expect(result.value.netWorth.toCents()).toBe(1_200_000n);
    }
  });

  it("agrega multiplas dividas vinculadas com seus outstandings", async () => {
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
      withAllocations: { asset, allocations: allocs },
      debtsById: new Map([
        [debt1.id, debt1],
        [debt2.id, debt2],
      ]),
    });

    const result = await getAssetDetail(deps, {
      userId: "user-1",
      assetId: "a1",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.linkedDebts).toHaveLength(2);
      const totalOutstanding = result.value.linkedDebts.reduce(
        (acc, l) => acc + l.outstandingOnAsset.toCents(),
        0n,
      );
      expect(totalOutstanding).toBe(1_500_000n);
      // netWorth = 5M - 1.5M = 3.5M
      expect(result.value.netWorth.toCents()).toBe(3_500_000n);
    }
  });

  it("pula alocacao cuja divida sumiu (findById retorna null)", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const ghostAlloc = makeAllocation("a1", "d-ghost", 1_000_000n);
    const deps = buildDeps({
      withAllocations: { asset, allocations: [ghostAlloc] },
      debtsById: new Map(),
    });

    const result = await getAssetDetail(deps, {
      userId: "user-1",
      assetId: "a1",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.linkedDebts).toHaveLength(0);
      // sem dividas presentes, netWorth = currentValue
      expect(result.value.netWorth.toCents()).toBe(5_000_000n);
    }
  });

  it("divida paid_off vinculada aparece em linkedDebts mas nao afeta netWorth", async () => {
    const asset = makeAsset({ id: "a1", currentValueCents: 5_000_000n });
    const paidOff = makeFinancing({
      id: "d1",
      originalPrincipalCents: 4_000_000n,
      currentBalanceCents: 0n,
      status: "paid_off",
    });
    const alloc = makeAllocation("a1", "d1", 4_000_000n);
    const deps = buildDeps({
      withAllocations: { asset, allocations: [alloc] },
      debtsById: new Map([[paidOff.id, paidOff]]),
    });

    const result = await getAssetDetail(deps, {
      userId: "user-1",
      assetId: "a1",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.linkedDebts).toHaveLength(1);
      // assetNetWorth ignora dividas com status != active
      expect(result.value.netWorth.toCents()).toBe(5_000_000n);
    }
  });
});
