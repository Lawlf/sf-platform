import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { PersonalLoanDebt } from "@/domain/entities/debt.entity";
import {
  AllocationExceedsPrincipal,
  AssetDeactivated,
  AssetNotFound,
  DebtNotActive,
  InvalidAllocation,
} from "@/domain/errors/asset-errors";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { linkAssetToDebt } from "./link-asset-to-debt.use-case";

function makeAssetRepo(): AssetRepository {
  return {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByUser: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };
}

function makeAllocRepo(sumExcludingCents = 0n): AssetDebtAllocationRepository {
  return {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(async () => Money.fromCents(sumExcludingCents)),
  };
}

function makeDebtRepo(): DebtRepository {
  return {
    findById: vi.fn(),
    listForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-19T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeMoney(v: number): Money {
  const r = Money.from(v);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeRate(v: number): InterestRate {
  const r = InterestRate.fromAnnual(v);
  if (!isOk(r)) throw new Error("test setup");
  return r.value;
}

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "asset-1",
    userId: "user-1",
    category: "vehicle",
    label: "Civic",
    currentValue: Money.fromCents(5_000_000n),
    metadata: null,
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
    ...overrides,
  };
}

function makeDebt(overrides: Partial<PersonalLoanDebt> = {}): PersonalLoanDebt {
  const principal = makeMoney(10000);
  return {
    id: "debt-1",
    userId: "user-1",
    label: "Emprestimo",
    status: "active",
    originalPrincipal: principal,
    currentBalance: principal,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "personal_loan",
    annualInterestRate: makeRate(0.2),
    termMonths: 12,
    monthlyInstallment: makeMoney(900),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  };
}

describe("linkAssetToDebt", () => {
  it("upserts a new allocation when within budget", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo(0n);
    const debts = makeDebtRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt());

    const result = await linkAssetToDebt(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        debtId: "debt-1",
        allocationOriginalCents: 500_000n,
      },
    );

    expect(isOk(result)).toBe(true);
    expect(allocations.sumAllocationsByDebt).toHaveBeenCalledWith("debt-1", "asset-1");
    expect(allocations.upsert).toHaveBeenCalledTimes(1);
    if (isOk(result)) {
      expect(result.value.assetId).toBe("asset-1");
      expect(result.value.debtId).toBe("debt-1");
      expect(result.value.allocationOriginal.toCents()).toBe(500_000n);
    }
  });

  it("returns InvalidAllocation for zero or negative allocation", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();

    const result = await linkAssetToDebt(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        debtId: "debt-1",
        allocationOriginalCents: 0n,
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAllocation);
    }
    expect(assets.findById).not.toHaveBeenCalled();
  });

  it("returns AssetNotFound when asset does not belong to user", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await linkAssetToDebt(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        assetId: "missing",
        debtId: "debt-1",
        allocationOriginalCents: 100n,
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetNotFound);
    }
  });

  it("returns AssetDeactivated when asset is deactivated", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAsset({ deactivatedAt: new Date(), deactivationReason: "Vendido" }),
    );

    const result = await linkAssetToDebt(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        debtId: "debt-1",
        allocationOriginalCents: 100n,
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetDeactivated);
    }
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await linkAssetToDebt(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        debtId: "missing",
        allocationOriginalCents: 100n,
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
  });

  it("returns Forbidden when debt belongs to another user", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt({ userId: "other" }));

    const result = await linkAssetToDebt(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        debtId: "debt-1",
        allocationOriginalCents: 100n,
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
  });

  it("returns DebtNotActive when debt status is not active", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDebt({ status: "written_off" }),
    );

    const result = await linkAssetToDebt(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        debtId: "debt-1",
        allocationOriginalCents: 100n,
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotActive);
    }
  });

  it("returns AllocationExceedsPrincipal with availableCents based on sum excluding this asset", async () => {
    const assets = makeAssetRepo();
    // Other assets already allocate 800_000 cents on the same debt.
    const allocations = makeAllocRepo(800_000n);
    const debts = makeDebtRepo();
    const clock = makeClock();
    (assets.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAsset());
    // principal = 10000 BRL = 1_000_000 cents. Available = 200_000 cents.
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt());

    const result = await linkAssetToDebt(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        assetId: "asset-1",
        debtId: "debt-1",
        allocationOriginalCents: 250_000n,
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AllocationExceedsPrincipal);
      const errVal = result.error as AllocationExceedsPrincipal;
      expect(errVal.availableCents).toBe(200_000n);
    }
    expect(allocations.upsert).not.toHaveBeenCalled();
  });
});
