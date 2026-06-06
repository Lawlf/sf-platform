import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import type { MonthClosingRepository } from "@/domain/ports/repositories/month-closing.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";

import { closeMonth } from "./close-month.use-case";
import type { MonthClosingDeps } from "./preview-month-closing.use-case";

const clock: Clock = { now: () => new Date("2026-06-15T00:00:00Z") };

function makeAsset(currentValueCents: bigint): AssetEntity {
  return {
    id: "asset-1",
    userId: "u1",
    category: "vehicle",
    label: "Carro",
    currentValue: Money.fromCents(currentValueCents),
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
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
  };
}

function makeIncome(amountReais: number): IncomeEntity {
  return {
    id: "income-1",
    userId: "u1",
    label: "Salario",
    amount: Money.fromCents(BigInt(Math.round(amountReais * 100))),
    frequency: "monthly",
    startDate: new Date("2025-01-01T00:00:00Z"),
    endDate: null,
    isActive: true,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    deletedAt: null,
  };
}

function makeClosing(monthIso: string): MonthClosingEntity {
  return {
    userId: "u1",
    month: MonthYear.fromIso(monthIso).firstDay(),
    baselineNetWorthCents: 0n,
    endNetWorthCents: 0n,
    theoreticalFreeCashFlowCents: 0n,
    leakCents: 0n,
    closedAt: new Date("2026-05-01T00:00:00Z"),
  };
}

function makeDeps(args: {
  closings: MonthClosingEntity[];
  assets?: AssetEntity[];
  incomes?: IncomeEntity[];
}): { deps: MonthClosingDeps; upsert: ReturnType<typeof vi.fn> } {
  const upsert = vi.fn(async () => {});
  const closingsStore = args.closings;

  const closings: MonthClosingRepository = {
    upsert,
    listForUser: async () => closingsStore,
    latest: async () => {
      if (closingsStore.length === 0) return null;
      return [...closingsStore].sort((a, b) => b.month.getTime() - a.month.getTime())[0]!;
    },
  };

  const assets = {
    findActiveByUser: async () => args.assets ?? [],
  } as unknown as AssetRepository;
  const allocations = {
    findByAsset: async () => [],
  } as unknown as AssetDebtAllocationRepository;
  const debts = {
    listForUser: async () => [],
  } as unknown as DebtRepository;
  const incomes = {
    listForUser: async () => args.incomes ?? [],
  } as unknown as IncomeRepository;
  const payments = {
    listForUserInRange: async () => [],
  } as unknown as DebtPaymentRepository;
  const rates = {
    findLatest: async () => null,
  } as unknown as MonthClosingDeps["rates"];
  const overrides = {
    find: async () => null,
  } as unknown as MonthClosingDeps["overrides"];

  return {
    deps: { closings, assets, allocations, debts, incomes, payments, clock, rates, overrides },
    upsert,
  };
}

describe("closeMonth", () => {
  it("persists the closing for the open month and returns the leak", async () => {
    const { deps, upsert } = makeDeps({
      closings: [],
      assets: [makeAsset(80_000n)],
      incomes: [makeIncome(1000)],
    });

    const r = await closeMonth(deps, { userId: "u1" });

    expect(r).toEqual({ ok: true, leakCents: 100_000n, status: "leaked" });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      userId: "u1",
      month: MonthYear.fromIso("2026-05").firstDay(),
      baselineNetWorthCents: 80_000n,
      endNetWorthCents: 80_000n,
      theoreticalFreeCashFlowCents: 100_000n,
      leakCents: 100_000n,
      closedAt: new Date("2026-06-15T00:00:00Z"),
    });
  });

  it("rejects when there is no open month", async () => {
    const { deps, upsert } = makeDeps({ closings: [makeClosing("2026-05")] });

    const r = await closeMonth(deps, { userId: "u1" });

    expect(r.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});
