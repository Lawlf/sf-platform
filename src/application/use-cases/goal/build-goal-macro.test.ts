import { describe, expect, it, vi } from "vitest";

import type { DebtStatus, PersonalLoanDebt } from "@/domain/entities/debt.entity";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money, type Currency } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { buildGoalMacro } from "./build-goal-macro";

const NOW = new Date("2026-05-19T10:00:00Z");

function rateAnnual(value: number): InterestRate {
  const r = InterestRate.fromAnnual(value);
  if (!isOk(r)) throw new Error("rate setup failed");
  return r.value;
}

function makePersonalLoan({
  id,
  originalPrincipalCents,
  currentBalanceCents,
  monthlyInstallmentCents,
  currency = "BRL",
}: {
  id: string;
  originalPrincipalCents: bigint;
  currentBalanceCents: bigint;
  monthlyInstallmentCents: bigint;
  currency?: Currency;
}): PersonalLoanDebt {
  return {
    id,
    userId: "user-1",
    kind: "personal_loan",
    label: "Emprestimo",
    status: "active",
    originalPrincipal: Money.fromCents(originalPrincipalCents, currency),
    currentBalance: Money.fromCents(currentBalanceCents, currency),
    startDate: new Date("2024-01-01"),
    expectedEndDate: null,
    notes: null,
    annualInterestRate: rateAnnual(0.12),
    termMonths: 24,
    monthlyInstallment: Money.fromCents(monthlyInstallmentCents, currency),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

function buildDeps({
  debts,
  rate = null,
}: {
  debts: PersonalLoanDebt[];
  rate?: string | null;
}) {
  const assets: AssetRepositoryPort = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByUser: vi.fn(async () => []),
    createDefaultWallet: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(async () => []),
    listCryptoTickersForUser: vi.fn(async () => []),
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };

  const allocations: AssetDebtAllocationRepositoryPort = {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(async () => []),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(),
  };

  const debtRepo: DebtRepositoryPort = {
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
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };

  const incomes: IncomeRepositoryPort = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    listForUser: vi.fn(async () => []),
    setActive: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };

  const rates: ExchangeRateRepositoryPort = {
    upsertDaily: vi.fn(),
    findLatest: vi.fn(async () => (rate ? ({ rateDecimal: rate, asOf: NOW } as never) : null)),
  };

  const overrides: UserFxOverrideRepositoryPort = {
    find: vi.fn(async () => null),
    upsert: vi.fn(),
    remove: vi.fn(),
    listForUser: vi.fn(async () => []),
  };

  const clock = { now: vi.fn(() => NOW) };

  return { assets, allocations, debts: debtRepo, incomes, clock, rates, overrides };
}

describe("buildGoalMacro", () => {
  it("converte os valores de uma divida em moeda estrangeira para a base", async () => {
    const debt = makePersonalLoan({
      id: "d1",
      originalPrincipalCents: 100_000n,
      currentBalanceCents: 80_000n,
      monthlyInstallmentCents: 5_000n,
      currency: "USD",
    });
    const deps = buildDeps({ debts: [debt], rate: "5.00" });

    const macro = await buildGoalMacro(deps, { userId: "user-1" });

    expect(macro.debts).toHaveLength(1);
    expect(macro.debts[0]?.originalPrincipalCents).toBe(500_000n);
    expect(macro.debts[0]?.currentBalanceCents).toBe(400_000n);
  });

  it("mantem valores em BRL inalterados", async () => {
    const debt = makePersonalLoan({
      id: "d1",
      originalPrincipalCents: 100_000n,
      currentBalanceCents: 80_000n,
      monthlyInstallmentCents: 5_000n,
      currency: "BRL",
    });
    const deps = buildDeps({ debts: [debt] });

    const macro = await buildGoalMacro(deps, { userId: "user-1" });

    expect(macro.debts[0]?.originalPrincipalCents).toBe(100_000n);
    expect(macro.debts[0]?.currentBalanceCents).toBe(80_000n);
  });
});
