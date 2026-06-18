import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { MonthClosingRepositoryPort } from "@/domain/ports/repositories/month-closing.repository";
import { Money, type Currency } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";

import { previewMonthClosing, type MonthClosingDeps } from "./preview-month-closing.use-case";

const clock: Clock = { now: () => new Date("2026-06-15T00:00:00Z") };

function makeAsset(currentValueCents: bigint, currency: Currency = "BRL"): AssetEntity {
  return {
    id: "asset-1",
    userId: "u1",
    profileId: "profile-1",
    category: "vehicle",
    label: "Carro",
    currentValue: Money.fromCents(currentValueCents, currency),
    metadata: { kind: "vehicle", brand: "Honda", model: "Civic", year: 2020 },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: new Date("2025-01-01T00:00:00Z"),
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };
}

function makeIncome(amountReais: number): IncomeEntity {
  return {
    id: "income-1",
    userId: "u1",
    profileId: "profile-1",
    label: "Salario",
    amount: Money.fromCents(BigInt(Math.round(amountReais * 100))),
    frequency: "monthly",
    startDate: new Date("2025-01-01T00:00:00Z"),
    paymentDay: null,
    endDate: null,
    isEstimated: false,
    isActive: true,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    deletedAt: null,
  };
}

function makeClosing(monthIso: string, endNetWorthCents: bigint): MonthClosingEntity {
  return {
    userId: "u1",
    month: MonthYear.fromIso(monthIso).firstDay(),
    baselineNetWorthCents: 0n,
    endNetWorthCents,
    theoreticalFreeCashFlowCents: 0n,
    leakCents: 0n,
    closedAt: new Date("2026-05-01T00:00:00Z"),
  };
}

interface Stored {
  closings?: MonthClosingEntity[];
  assets?: AssetEntity[];
  incomes?: IncomeEntity[];
  rate?: string | null;
}

function makeDeps(stored: Stored): MonthClosingDeps {
  const closingsStore = stored.closings ?? [];
  const assetsStore = stored.assets ?? [];
  const incomesStore = stored.incomes ?? [];
  const rateDecimal = stored.rate ?? null;

  const closings: MonthClosingRepositoryPort = {
    upsert: async () => {},
    listForUser: async () => closingsStore,
    latest: async () => {
      if (closingsStore.length === 0) return null;
      return [...closingsStore].sort((a, b) => b.month.getTime() - a.month.getTime())[0]!;
    },
  };

  const assets = {
    findActiveByProfile: async () => assetsStore,
  } as unknown as AssetRepositoryPort;

  const allocations = {
    findByAsset: async () => [],
  } as unknown as AssetDebtAllocationRepositoryPort;

  const debts = {
    listForProfile: async () => [],
  } as unknown as DebtRepositoryPort;

  const incomes = {
    listForProfile: async () => incomesStore,
  } as unknown as IncomeRepositoryPort;

  const payments = {
    listForProfileInRange: async () => [],
  } as unknown as DebtPaymentRepositoryPort;

  const rates = {
    findLatest: async () =>
      rateDecimal ? { rateDecimal, asOf: new Date("2026-06-15T00:00:00Z") } : null,
  } as unknown as MonthClosingDeps["rates"];

  const overrides = {
    find: async () => null,
  } as unknown as MonthClosingDeps["overrides"];

  return { closings, assets, allocations, debts, incomes, payments, clock, rates, overrides };
}

describe("previewMonthClosing", () => {
  it("returns { open: false } when there is no month to close", async () => {
    const deps = makeDeps({ closings: [makeClosing("2026-05", 0n)] });
    const r = await previewMonthClosing(deps, { userId: "u1", profileId: "profile-1" });
    expect(r).toEqual({ open: false });
  });

  it("reports a leak on a first close, taking the baseline from the timeline", async () => {
    const deps = makeDeps({
      assets: [makeAsset(80_000n)],
      incomes: [makeIncome(1000)],
    });
    const r = await previewMonthClosing(deps, { userId: "u1", profileId: "profile-1" });
    expect(r.open).toBe(true);
    if (!r.open) return;
    expect(r.monthIso).toBe("2026-05");
    expect(r.theoreticalFreeCashFlowCents).toBe(100_000n);
    expect(r.baselineNetWorthCents).toBe(80_000n);
    expect(r.endNetWorthCents).toBe(80_000n);
    expect(r.leakCents).toBe(100_000n);
    expect(r.status).toBe("leaked");
  });

  it("reports ahead on a subsequent close, taking the baseline from the previous closing", async () => {
    const deps = makeDeps({
      closings: [makeClosing("2026-04", 50_000n)],
      assets: [makeAsset(300_000n)],
      incomes: [makeIncome(1000)],
    });
    const r = await previewMonthClosing(deps, { userId: "u1", profileId: "profile-1" });
    expect(r.open).toBe(true);
    if (!r.open) return;
    expect(r.monthIso).toBe("2026-05");
    expect(r.theoreticalFreeCashFlowCents).toBe(100_000n);
    expect(r.baselineNetWorthCents).toBe(50_000n);
    expect(r.endNetWorthCents).toBe(300_000n);
    expect(r.leakCents).toBe(-150_000n);
    expect(r.status).toBe("ahead");
  });

  it("converts a foreign asset when computing the baseline from the timeline", async () => {
    const deps = makeDeps({
      assets: [makeAsset(20_000n, "USD" as Currency)],
      incomes: [makeIncome(0)],
      rate: "5.00",
    });
    const r = await previewMonthClosing(deps, { userId: "u1", profileId: "profile-1" });
    expect(r.open).toBe(true);
    if (!r.open) return;
    expect(r.baselineNetWorthCents).toBe(100_000n);
    expect(r.endNetWorthCents).toBe(100_000n);
  });
});
