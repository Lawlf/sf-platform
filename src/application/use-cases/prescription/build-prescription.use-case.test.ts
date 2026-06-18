import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { FxRateUnavailableError } from "@/domain/errors/financial-errors";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { buildPrescription } from "./build-prescription.use-case";

const NOW = new Date("2026-05-25T00:00:00Z");
const m = (r: number) => {
  const x = Money.from(r);
  if (!isOk(x)) throw new Error("m");
  return x.value;
};
const mUsd = (r: number) => {
  const x = Money.from(r, "USD");
  if (!isOk(x)) throw new Error("mUsd");
  return x.value;
};
const fxDeps = (rateDecimal: string | null) => ({
  rates: {
    upsertDaily: vi.fn(),
    findLatest: vi.fn().mockResolvedValue(
      rateDecimal ? { rateDecimal, asOf: NOW } : null,
    ),
  },
  overrides: {
    find: vi.fn().mockResolvedValue(null),
    upsert: vi.fn(),
    remove: vi.fn(),
    listForUser: vi.fn(),
  },
  clock: { now: vi.fn(() => NOW) },
});
const rate = (d: number) => {
  const x = InterestRate.fromMonthly(d);
  if (!isOk(x)) throw new Error("r");
  return x.value;
};

const income: IncomeEntity = {
  id: "i1",
  userId: "u1",
  profileId: "profile-1",
  label: "Salário",
  amount: m(5000),
  frequency: "monthly",
  startDate: NOW,
  paymentDay: null,
  endDate: null,
  isEstimated: false,
  isActive: true,
  createdAt: NOW,
  deletedAt: null,
};

const dearCard = {
  id: "nubank",
  userId: "u1",
  label: "Nubank",
  kind: "credit_card",
  status: "active",
  currentBalance: m(3000),
  originalPrincipal: m(3000),
  creditLimit: m(6000),
  statementDay: 1,
  dueDay: 10,
  currentStatement: m(1000),
  revolvingBalance: m(3000),
  revolvingMonthlyRate: rate(0.129),
  installmentPurchases: [],
  createdAt: NOW,
  deletedAt: null,
} as unknown as DebtEntity;

const cashAsset = {
  id: "a1",
  userId: "u1",
  category: "cash",
  label: "Reserva",
  currentValue: m(5000),
  metadata: null,
  createdAt: NOW,
  deletedAt: null,
} as unknown as AssetEntity;

const deps = {
  debts: { listForProfile: async () => [dearCard] },
  incomes: { listForProfile: async () => [income] },
  assets: { findActiveByProfile: async () => [cashAsset] },
  now: () => NOW,
  ...fxDeps(null),
};

describe("buildPrescription", () => {
  it("assembles a bleeding prescription for an expensive card with cushion present", async () => {
    const r = await buildPrescription(deps as never, { userId: "u1", profileId: "profile-1" });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.state).toBe("bleeding");
    expect(r.value.dominant?.targetDebtId).toBe("nubank");
  });

  it("converts foreign income to base before the figures", async () => {
    const usdIncome = { ...income, id: "iUsd", amount: mUsd(1000) } as IncomeEntity;
    const fxConverted = {
      debts: { listForProfile: async () => [] },
      incomes: { listForProfile: async () => [usdIncome] },
      assets: { findActiveByProfile: async () => [] },
      now: () => NOW,
      ...fxDeps("5.00"),
    };
    const r = await buildPrescription(fxConverted as never, { userId: "u1", profileId: "profile-1" });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.dominant?.type).toBe("invest");
    expect(r.value.dominant?.metrics.monthlyContributionReais).toBe(5000);
  });

  it("returns the FX error when a foreign entity has no rate", async () => {
    const usdAsset = { ...cashAsset, id: "aUsd", currentValue: mUsd(1000) } as AssetEntity;
    const noRate = {
      debts: { listForProfile: async () => [] },
      incomes: { listForProfile: async () => [income] },
      assets: { findActiveByProfile: async () => [usdAsset] },
      now: () => NOW,
      ...fxDeps(null),
    };
    const r = await buildPrescription(noRate as never, { userId: "u1", profileId: "profile-1" });
    expect(isErr(r)).toBe(true);
    if (!isErr(r)) return;
    expect(r.error).toBeInstanceOf(FxRateUnavailableError);
  });
});
