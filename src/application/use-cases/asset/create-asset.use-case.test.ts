import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { PersonalLoanDebt } from "@/domain/entities/debt.entity";
import {
  AllocationExceedsPrincipal,
  AssetMetadataMismatch,
  DebtNotActive,
  InvalidAllocation,
  InvalidAssetLabel,
  InvalidAssetValue,
} from "@/domain/errors/asset-errors";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { createAsset } from "./create-asset.use-case";

function makeAssetRepo(): AssetRepositoryPort {
  return {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByProfile: vi.fn(),
    createDefaultWallet: vi.fn(),
    findActiveByProfileAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForProfile: vi.fn(async () => []),
    listCryptoTickersForProfile: vi.fn(async () => []),
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };
}

function makeAllocRepo(initialSumCents = 0n): AssetDebtAllocationRepositoryPort {
  return {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(async () => Money.fromCents(initialSumCents)),
  };
}

function makeDebtRepo(): DebtRepositoryPort {
  return {
    findById: vi.fn(),
    listForProfile: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
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

function makeDebt(overrides: Partial<PersonalLoanDebt> = {}): PersonalLoanDebt {
  const principal = makeMoney(10000);
  return {
    id: "debt-1",
    userId: "user-1",
    profileId: "profile-1",
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
    dueDay: null,
    payrollDeducted: false,
    linkedIncomeId: null,
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

describe("createAsset", () => {
  it("creates a vehicle asset without allocations on happy path", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "vehicle",
        label: "Civic 2020",
        currentValueCents: 8_000_000n,
        currency: "BRL",
        metadata: { kind: "vehicle", brand: "Honda", model: "Civic", year: 2020 },
        fipeCode: "001",
        acquiredAt: new Date("2025-01-01"),
        allocations: [],
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const asset = result.value;
      expect(asset.userId).toBe("user-1");
      expect(asset.category).toBe("vehicle");
      expect(asset.label).toBe("Civic 2020");
      expect(asset.currentValue.toCents()).toBe(8_000_000n);
      expect(asset.deactivatedAt).toBeNull();
      expect(asset.fipeLastSyncedAt).toBeNull();
    }
    expect(assets.create).toHaveBeenCalledTimes(1);
    expect(allocations.upsert).not.toHaveBeenCalled();
  });

  it("trims label and rejects empty after trim", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "   ",
        currentValueCents: 1_000n,
        currency: "BRL",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        allocations: [],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAssetLabel);
    }
    expect(assets.create).not.toHaveBeenCalled();
  });

  it("rejects negative currentValueCents", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "Coisa",
        currentValueCents: -1n,
        currency: "BRL",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        allocations: [],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAssetValue);
    }
  });

  it("rejects metadata whose kind does not match category", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "vehicle",
        label: "Casa",
        currentValueCents: 100_000n,
        currency: "BRL",
        metadata: { kind: "real_estate", addressCity: "Sao Paulo" },
        fipeCode: null,
        acquiredAt: null,
        allocations: [],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AssetMetadataMismatch);
    }
  });

  it("returns InvalidAllocation when allocation is zero or negative", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt());
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "Coisa",
        currentValueCents: 100n,
        currency: "BRL",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        allocations: [{ debtId: "debt-1", allocationOriginalCents: 0n }],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(InvalidAllocation);
    }
  });

  it("returns DebtNotFound when allocation references missing debt", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "Coisa",
        currentValueCents: 100n,
        currency: "BRL",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        allocations: [{ debtId: "missing", allocationOriginalCents: 100n }],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
    expect(assets.create).not.toHaveBeenCalled();
  });

  it("returns Forbidden when allocation references debt owned by other profile", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDebt({ userId: "other-user", profileId: "profile-2" }),
    );
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "Coisa",
        currentValueCents: 100n,
        currency: "BRL",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        allocations: [{ debtId: "debt-1", allocationOriginalCents: 100n }],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
  });

  it("returns DebtNotActive when debt is paid_off", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo();
    const debts = makeDebtRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDebt({ status: "paid_off" }),
    );
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "Coisa",
        currentValueCents: 100n,
        currency: "BRL",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        allocations: [{ debtId: "debt-1", allocationOriginalCents: 100n }],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotActive);
    }
  });

  it("returns AllocationExceedsPrincipal when single allocation exceeds debt principal", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo(0n);
    const debts = makeDebtRepo();
    // principal = 10000 BRL => 1_000_000n cents
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt());
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "Coisa",
        currentValueCents: 200_000_000n,
        currency: "BRL",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        allocations: [{ debtId: "debt-1", allocationOriginalCents: 2_000_000n }],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AllocationExceedsPrincipal);
      const errVal = result.error as AllocationExceedsPrincipal;
      expect(errVal.debtId).toBe("debt-1");
      expect(errVal.availableCents).toBe(1_000_000n);
    }
    expect(assets.create).not.toHaveBeenCalled();
  });

  it("returns AllocationExceedsPrincipal when current sum + new exceeds principal", async () => {
    const assets = makeAssetRepo();
    // Existing allocations on this debt already sum 700 BRL (70_000 cents).
    const allocations = makeAllocRepo(70_000n);
    const debts = makeDebtRepo();
    // principal = 10000 BRL = 1_000_000 cents. Available = 930_000 cents.
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt());
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "Coisa",
        currentValueCents: 100_000n,
        currency: "BRL",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        // 950_000 cents requested, 930_000 cents available -> exceeds.
        allocations: [{ debtId: "debt-1", allocationOriginalCents: 950_000n }],
      },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(AllocationExceedsPrincipal);
      const errVal = result.error as AllocationExceedsPrincipal;
      expect(errVal.availableCents).toBe(930_000n);
    }
  });

  it("succeeds when allocation stays within available budget and persists allocation", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo(70_000n);
    const debts = makeDebtRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt());
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "Coisa",
        currentValueCents: 100_000n,
        currency: "BRL",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        allocations: [{ debtId: "debt-1", allocationOriginalCents: 500_000n }],
      },
    );

    expect(isOk(result)).toBe(true);
    expect(allocations.upsert).toHaveBeenCalledTimes(1);
    const persistedAlloc = (allocations.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      allocationOriginal: Money;
      debtId: string;
    };
    expect(persistedAlloc.debtId).toBe("debt-1");
    expect(persistedAlloc.allocationOriginal.toCents()).toBe(500_000n);

    if (isOk(result)) {
      const persistedAsset = (assets.create as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as AssetEntity;
      expect(persistedAsset.id).toBe(result.value.id);
      expect(persistedAsset.createdAt).toEqual(persistedAsset.updatedAt);
    }
  });

  it("persists currentValue and allocation in the chosen currency", async () => {
    const assets = makeAssetRepo();
    const allocations = makeAllocRepo(0n);
    const debts = makeDebtRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDebt({ originalPrincipal: Money.fromCents(10_000_000n, "USD") }),
    );
    const clock = makeClock();

    const result = await createAsset(
      { assets, allocations, debts, clock },
      {
        userId: "user-1",
        profileId: "profile-1",
        category: "other",
        label: "Conta nos EUA",
        currentValueCents: 500_000n,
        currency: "USD",
        metadata: null,
        fipeCode: null,
        acquiredAt: null,
        allocations: [{ debtId: "debt-1", allocationOriginalCents: 200_000n }],
      },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.currentValue.currency).toBe("USD");
      expect(result.value.currentValue.toCents()).toBe(500_000n);
    }
    const persistedAlloc = (allocations.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      allocationOriginal: Money;
    };
    expect(persistedAlloc.allocationOriginal.currency).toBe("USD");
    expect(persistedAlloc.allocationOriginal.toCents()).toBe(200_000n);
  });
});
