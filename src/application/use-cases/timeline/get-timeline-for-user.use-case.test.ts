import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { PersonalLoanDebt, RecurringDebt } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { ExchangeRateRepositoryPort } from "@/domain/ports/repositories/exchange-rate.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { UserFxOverrideRepositoryPort } from "@/domain/ports/repositories/user-fx-override.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money, type Currency } from "@/domain/value-objects/money.vo";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { getTimelineForUser } from "./get-timeline-for-user.use-case";

function makeIncomeRepo(): IncomeRepositoryPort {
  return {
    findById: vi.fn(),
    listForProfile: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
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

function makePaymentsRepo(): DebtPaymentRepositoryPort {
  return {
    listForDebt: vi.fn(),
    listForProfileInRange: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
  };
}

function makeAssetRepo(): AssetRepositoryPort {
  return {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findActiveByUser: vi.fn(),
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
}

function makeRecurring(overrides: Partial<RecurringDebt> = {}): RecurringDebt {
  return {
    id: "rec-1",
    userId: "user-1",
    profileId: "profile-1",
    label: "Aluguel",
    status: "active",
    originalPrincipal: Money.fromCents(0n),
    currentBalance: Money.fromCents(0n),
    startDate: new Date("2026-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    kind: "recurring",
    deletedAt: null,
    recurringFrequency: "monthly",
    recurringAmountCents: 150_000n,
    expenseCategory: "housing",
    dueDay: null,
    ...overrides,
  };
}

function makeMoney(v: number): Money {
  const r = Money.from(v);
  if (!isOk(r)) throw new Error("test setup: money");
  return r.value;
}

function makeRate(v: number): InterestRate {
  const r = InterestRate.fromAnnual(v);
  if (!isOk(r)) throw new Error("test setup: rate");
  return r.value;
}

function makeIncome(overrides: Partial<IncomeEntity> = {}): IncomeEntity {
  const startDate = overrides.startDate ?? new Date("2026-01-01T00:00:00Z");
  const base: IncomeEntity = {
    id: "income-1",
    userId: "user-1",
    profileId: "profile-1",
    label: "Salario",
    amount: makeMoney(5000),
    frequency: "monthly",
    startDate,
    paymentDay: null,
    endDate: null,
    isEstimated: false,
    isActive: true,
    createdAt: startDate,
    deletedAt: null,
  };
  return { ...base, ...overrides };
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
    currentBalance: makeMoney(8000),
    startDate: new Date("2026-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    kind: "personal_loan",
    dueDay: null,
    annualInterestRate: makeRate(0.24),
    termMonths: 12,
    monthlyInstallment: makeMoney(950),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
    ...overrides,
  };
}

function makePayment(overrides: Partial<DebtPaymentEntity> = {}): DebtPaymentEntity {
  return {
    id: "pay-1",
    debtId: "debt-1",
    paidAt: new Date("2026-01-15T00:00:00Z"),
    amount: makeMoney(1000),
    principalPortion: makeMoney(800),
    interestPortion: makeMoney(200),
    isExtra: false,
    isClosingPayment: false,
    ...overrides,
  };
}

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "asset-1",
    userId: "user-1",
    category: "vehicle",
    label: "Carro",
    currentValue: makeMoney(30000),
    metadata: null,
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
    ...overrides,
  };
}

const NOW = new Date("2026-06-15T00:00:00Z");

function makeFx(rate: string | null = null) {
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
  return { rates, overrides, clock };
}

function emptyRepos() {
  const incomes = makeIncomeRepo();
  const debts = makeDebtRepo();
  const debtPayments = makePaymentsRepo();
  const assets = makeAssetRepo();
  (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  return { incomes, debts, debtPayments, assets, ...makeFx() };
}

describe("getTimelineForUser (cursor pagination + stories)", () => {
  it("returns ok with empty points, no stories and null cursor when repos are empty", async () => {
    const deps = emptyRepos();
    const before = MonthYear.from(2026, 5);

    const result = await getTimelineForUser(deps, {
      userId: "user-empty",
      profileId: "profile-1",
      before,
      limit: 6,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.points).toHaveLength(6);
    expect(result.value.stories).toEqual([]);
    expect(result.value.olderMonthIso).toBeNull();
    expect(result.value.oldestUserDataIso).toBeNull();
  });

  it("returns 6 points (most recent first) for a 6-month page", async () => {
    const deps = emptyRepos();
    const before = MonthYear.from(2026, 6);

    const result = await getTimelineForUser(deps, {
      userId: "user-1",
      profileId: "profile-1",
      before,
      limit: 6,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.points).toHaveLength(6);
    expect(result.value.points[0]?.month.toIso()).toBe("2026-06");
    expect(result.value.points[1]?.month.toIso()).toBe("2026-05");
    expect(result.value.points[2]?.month.toIso()).toBe("2026-04");
    expect(result.value.points[3]?.month.toIso()).toBe("2026-03");
    expect(result.value.points[4]?.month.toIso()).toBe("2026-02");
    expect(result.value.points[5]?.month.toIso()).toBe("2026-01");
  });

  it("uses `before` as the cursor controlling the window's most recent month", async () => {
    const deps = emptyRepos();
    const before = MonthYear.from(2026, 3);

    const result = await getTimelineForUser(deps, {
      userId: "user-1",
      profileId: "profile-1",
      before,
      limit: 3,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.points.map((p) => p.month.toIso())).toEqual([
      "2026-03",
      "2026-02",
      "2026-01",
    ]);
  });

  it("paginates: olderMonthIso points to the month right before the page's earliest", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();
    const income = makeIncome({
      startDate: new Date("2024-01-01T00:00:00Z"),
    });
    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const before = MonthYear.from(2026, 6);
    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      { userId: "user-1", profileId: "profile-1", before, limit: 3 },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.olderMonthIso).toBe("2026-03");
  });

  it("olderMonthIso is null when no older user data exists", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();
    const income = makeIncome({
      startDate: new Date("2026-04-01T00:00:00Z"),
    });
    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const before = MonthYear.from(2026, 6);
    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      { userId: "user-1", profileId: "profile-1", before, limit: 3 },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.olderMonthIso).toBeNull();
    expect(result.value.oldestUserDataIso).toBe("2026-04");
  });

  it("range='12' caps olderMonthIso to null when the page boundary reaches the range edge", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();
    const income = makeIncome({
      startDate: new Date("2020-01-01T00:00:00Z"),
    });
    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const now = MonthYear.from(2026, 5);
    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      {
        userId: "user-1",
        profileId: "profile-1",
        before: MonthYear.from(2026, 5),
        limit: 12,
        range: "12",
        now,
      },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.olderMonthIso).toBeNull();
  });

  it("range='12' still allows pagination when the page does not reach the range edge", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();
    const income = makeIncome({
      startDate: new Date("2020-01-01T00:00:00Z"),
    });
    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const now = MonthYear.from(2026, 5);
    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      {
        userId: "user-1",
        profileId: "profile-1",
        before: MonthYear.from(2026, 5),
        limit: 6,
        range: "12",
        now,
      },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.olderMonthIso).toBe("2025-11");
  });

  it("show='with-payments' filters out months with zero debt payments", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();

    const income = makeIncome({ amount: makeMoney(5000) });
    const debt = makeDebt({ currentBalance: makeMoney(8000) });
    const payment = makePayment({
      id: "pay-1",
      paidAt: new Date("2026-02-15T00:00:00Z"),
      amount: makeMoney(1000),
    });

    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([debt]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([payment]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      {
        userId: "user-1",
        profileId: "profile-1",
        before: MonthYear.from(2026, 3),
        limit: 3,
        show: "with-payments",
      },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.points).toHaveLength(1);
    expect(result.value.points[0]?.month.toIso()).toBe("2026-02");
    expect(result.value.points[0]?.totalDebtPayments.toCents()).toBe(makeMoney(1000).toCents());
  });

  it("recurring debt subtracts from freeBalance and accumulates in totalDebtPayments", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();

    const income = makeIncome({ amount: makeMoney(5000) });
    const rec = makeRecurring({
      recurringAmountCents: 150_000n, // R$ 1.500,00
      startDate: new Date("2025-01-01T00:00:00Z"),
    });

    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([rec]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      {
        userId: "user-1",
        profileId: "profile-1",
        before: MonthYear.from(2026, 3),
        limit: 3,
      },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    for (const p of result.value.points) {
      expect(p.totalIncome.toCents()).toBe(makeMoney(5000).toCents());
      expect(p.totalDebtPayments.toCents()).toBe(150_000n);
      expect(p.freeBalance.toCents()).toBe(makeMoney(3500).toCents());
    }
  });

  it("show='all' (default) keeps every month in the page", async () => {
    const deps = emptyRepos();
    const result = await getTimelineForUser(deps, {
      userId: "user-1",
      profileId: "profile-1",
      before: MonthYear.from(2026, 3),
      limit: 3,
      show: "all",
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.points).toHaveLength(3);
  });

  it("returns stories alongside points when a story is detectable in the page", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();

    const income = makeIncome({
      amount: makeMoney(5000),
      startDate: new Date("2025-01-01T00:00:00Z"),
    });
    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      {
        userId: "user-1",
        profileId: "profile-1",
        before: MonthYear.from(2026, 6),
        limit: 6,
      },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.stories.length).toBeGreaterThan(0);
  });

  it("oldestUserDataIso reflects the earliest among income.startDate, debt.createdAt and asset.createdAt", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();

    const income = makeIncome({
      startDate: new Date("2024-06-01T00:00:00Z"),
    });
    const debt = makeDebt({
      createdAt: new Date("2023-02-01T00:00:00Z"),
    });
    const asset = makeAsset({
      createdAt: new Date("2025-09-01T00:00:00Z"),
    });

    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([debt]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([asset]);

    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      {
        userId: "user-1",
        profileId: "profile-1",
        before: MonthYear.from(2026, 6),
        limit: 3,
      },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.oldestUserDataIso).toBe("2023-02");
  });

  it("passes the userId argument to every repository call (user isolation)", async () => {
    const deps = emptyRepos();
    await getTimelineForUser(deps, {
      userId: "user-42",
      profileId: "profile-42",
      before: MonthYear.from(2026, 3),
      limit: 3,
    });

    expect(deps.incomes.listForProfile).toHaveBeenCalledWith("profile-42");
    expect(deps.debts.listForProfile).toHaveBeenCalledWith("profile-42", { status: "all" });
    expect(deps.debtPayments.listForProfileInRange).toHaveBeenCalledWith(
      "profile-42",
      expect.objectContaining({
        from: MonthYear.from(2025, 12).firstDay(),
        to: MonthYear.from(2026, 3).lastDay(),
      }),
    );
    expect(deps.assets.findActiveByUser).toHaveBeenCalledWith("user-42");
  });

  it("fetches all repositories in parallel", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();

    const order: string[] = [];
    const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push("incomes:start");
      await delay(20);
      order.push("incomes:end");
      return [];
    });
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push("debts:start");
      await delay(20);
      order.push("debts:end");
      return [];
    });
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push("payments:start");
      await delay(20);
      order.push("payments:end");
      return [];
    });
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push("assets:start");
      await delay(20);
      order.push("assets:end");
      return [];
    });

    await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      { userId: "user-1", profileId: "profile-1", before: MonthYear.from(2026, 3), limit: 3 },
    );

    const firstEndIdx = order.findIndex((e) => e.endsWith(":end"));
    const starts = order.slice(0, firstEndIdx);
    expect(starts).toHaveLength(4);
    expect(new Set(starts)).toEqual(
      new Set(["incomes:start", "debts:start", "payments:start", "assets:start"]),
    );
  });

  it("range='all' never caps olderMonthIso based on a synthetic now", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();
    const income = makeIncome({
      startDate: new Date("2020-01-01T00:00:00Z"),
    });
    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx() },
      {
        userId: "user-1",
        profileId: "profile-1",
        before: MonthYear.from(2026, 5),
        limit: 6,
        range: "all",
        now: MonthYear.from(2026, 5),
      },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.olderMonthIso).toBe("2025-11");
  });

  it("converts USD income, USD recurring debt and USD payment to BRL at rate 5.00", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();

    const income = makeIncome({
      amount: Money.fromCents(100_000n, "USD" as Currency),
      startDate: new Date("2025-01-01T00:00:00Z"),
    });
    const rec = makeRecurring({
      originalPrincipal: Money.fromCents(0n, "USD" as Currency),
      currentBalance: Money.fromCents(0n, "USD" as Currency),
      recurringAmountCents: 30_000n,
      startDate: new Date("2025-01-01T00:00:00Z"),
    });
    const payment = makePayment({
      paidAt: new Date("2026-02-15T00:00:00Z"),
      amount: Money.fromCents(20_000n, "USD" as Currency),
      principalPortion: Money.fromCents(16_000n, "USD" as Currency),
      interestPortion: Money.fromCents(4_000n, "USD" as Currency),
    });

    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([rec]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([payment]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx("5.00") },
      {
        userId: "user-1",
        profileId: "profile-1",
        before: MonthYear.from(2026, 3),
        limit: 3,
      },
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    for (const p of result.value.points) {
      expect(p.totalIncome.toCents()).toBe(500_000n);
    }
    const nonFeb = result.value.points.filter((p) => p.month.toIso() !== "2026-02");
    for (const p of nonFeb) {
      expect(p.totalDebtPayments.toCents()).toBe(150_000n);
      expect(p.freeBalance.toCents()).toBe(350_000n);
    }
    const feb = result.value.points.find((p) => p.month.toIso() === "2026-02");
    expect(feb?.totalDebtPayments.toCents()).toBe(250_000n);
  });

  it("returns isErr when a foreign entity has no available rate", async () => {
    const incomes = makeIncomeRepo();
    const debts = makeDebtRepo();
    const debtPayments = makePaymentsRepo();
    const assets = makeAssetRepo();

    const income = makeIncome({
      amount: Money.fromCents(100_000n, "USD" as Currency),
      startDate: new Date("2025-01-01T00:00:00Z"),
    });

    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([income]);
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (debtPayments.listForProfileInRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (assets.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getTimelineForUser(
      { incomes, debts, debtPayments, assets, ...makeFx(null) },
      {
        userId: "user-1",
        profileId: "profile-1",
        before: MonthYear.from(2026, 3),
        limit: 3,
      },
    );

    expect(isErr(result)).toBe(true);
  });
});
