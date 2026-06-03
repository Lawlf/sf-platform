import { describe, expect, it, vi } from "vitest";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { executeWrite, type WriteExecutorDeps } from "./write-executor";

function rate(annual: number): InterestRate {
  const r = InterestRate.fromAnnual(annual);
  if (!isOk(r)) throw new Error("test setup: invalid rate");
  return r.value;
}

function makeDeps(overrides: Partial<Record<keyof WriteExecutorDeps, unknown>> = {}): WriteExecutorDeps {
  const incomes = {
    findById: vi.fn(async () => null),
    listForUser: vi.fn(),
    create: vi.fn(async (e: IncomeEntity) => e),
    update: vi.fn(async (e: IncomeEntity) => e),
    setActive: vi.fn(),
    softDelete: vi.fn(),
  };
  const debts = {
    findById: vi.fn(async () => null),
    listForUser: vi.fn(),
    create: vi.fn(async (e: DebtEntity) => e),
    update: vi.fn(async (e: DebtEntity) => e),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
  };
  const payments = {
    listForDebt: vi.fn(),
    listForUserInRange: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
  };
  const allocations = {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(),
    findByDebt: vi.fn(),
    sumAllocationsByDebt: vi.fn(),
  };
  const assets = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(async () => null),
    findActiveByUser: vi.fn(),
    findActiveByUserAndCategory: vi.fn(),
    findByIdWithAllocations: vi.fn(),
    findActiveWithAllocations: vi.fn(),
    listStockTickersForUser: vi.fn(),
    softDelete: vi.fn(),
  };
  const goals = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(async () => null),
    listForUser: vi.fn(),
    countActive: vi.fn(async () => 0),
    softDelete: vi.fn(),
    listAllActive: vi.fn(),
  };
  const clock = { now: vi.fn(() => new Date("2026-06-03T12:00:00Z")) };

  return {
    incomes,
    debts,
    payments,
    allocations,
    assets,
    goals,
    clock,
    ...overrides,
  } as unknown as WriteExecutorDeps;
}

describe("executeWrite", () => {
  it("income_create chama registerIncome e retorna after + entityId + reversible", async () => {
    const deps = makeDeps();
    const r = await executeWrite(deps, {
      toolName: "income_create",
      userId: "u1",
      isPro: true,
      args: { label: "Salário", amountCents: 500000, frequency: "monthly", startDate: "2026-06-01" },
    });

    expect(r.entityType).toBe("income");
    expect(r.before).toBeNull();
    expect(r.after).toBeTruthy();
    expect(r.entityId).toBeTruthy();
    expect(r.after?.label).toBe("Salário");
    expect(r.after?.amount).toEqual({ cents: "500000", currency: "BRL" });
    expect(r.reversible).toBe(true);
  });

  it("income_update captura before via findById e retorna after", async () => {
    const existing: IncomeEntity = {
      id: "i1",
      userId: "u1",
      label: "Salário",
      amount: Money.fromCents(500000n),
      frequency: "monthly",
      startDate: new Date("2026-06-01"),
      endDate: null,
      isActive: true,
      createdAt: new Date("2026-06-01"),
      deletedAt: null,
    };
    const deps = makeDeps();
    (deps.incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (deps.incomes.update as ReturnType<typeof vi.fn>).mockImplementation(async (e: IncomeEntity) => e);

    const r = await executeWrite(deps, {
      toolName: "income_update",
      userId: "u1",
      isPro: true,
      args: { incomeId: "i1", amountCents: 600000 },
    });

    expect(r.entityType).toBe("income");
    expect(r.entityId).toBe("i1");
    expect(r.before).toEqual(
      expect.objectContaining({ id: "i1", amount: { cents: "500000", currency: "BRL" } }),
    );
    expect(r.after?.amount).toEqual({ cents: "600000", currency: "BRL" });
    expect(r.reversible).toBe(true);
  });

  it("debt_delete é irreversível e captura before", async () => {
    const existing = {
      id: "d1",
      userId: "u1",
      kind: "personal_loan",
      label: "Empréstimo",
      status: "active",
      originalPrincipal: Money.fromCents(1000000n),
      currentBalance: Money.fromCents(800000n),
      startDate: new Date("2026-01-01"),
      expectedEndDate: null,
      notes: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      deletedAt: null,
      recurringFrequency: null,
      recurringAmountCents: null,
      expenseCategory: null,
      annualInterestRate: rate(0.2),
      termMonths: 24,
      monthlyInstallment: Money.fromCents(50000n),
    } as unknown as DebtEntity;
    const deps = makeDeps();
    (deps.debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    const r = await executeWrite(deps, {
      toolName: "debt_delete",
      userId: "u1",
      isPro: true,
      args: { debtId: "d1" },
    });

    expect(r.entityType).toBe("debt");
    expect(r.entityId).toBe("d1");
    expect(r.before).toBeTruthy();
    expect(r.after).toBeNull();
    expect(r.reversible).toBe(false);
    expect(deps.payments.deleteByDebtId).toHaveBeenCalledWith("d1");
    expect(deps.allocations.deleteByDebtId).toHaveBeenCalledWith("d1");
    expect(deps.debts.softDelete).toHaveBeenCalled();
  });

  it("debt_create (financing) discrimina o kind e mapeia principal/taxa/prazo", async () => {
    const deps = makeDeps();
    const created = vi.fn(async (e: DebtEntity) => e);
    (deps.debts.create as ReturnType<typeof vi.fn>).mockImplementation(created);

    const r = await executeWrite(deps, {
      toolName: "debt_create",
      userId: "u1",
      isPro: true,
      args: {
        kind: "financing",
        label: "Apartamento",
        startDate: "2026-01-01",
        originalPrincipalCents: 30000000,
        annualInterestRate: 0.1,
        termMonths: 360,
        amortizationMethod: "SAC",
        monthlyInsuranceCents: 5000,
        monthlyAdminFeeCents: 2500,
      },
    });

    expect(r.entityType).toBe("debt");
    expect(r.entityId).toBeTruthy();
    expect(r.before).toBeNull();
    expect(r.after).toBeTruthy();
    expect(r.reversible).toBe(true);

    const entity = created.mock.calls[0]![0] as DebtEntity;
    expect(entity.kind).toBe("financing");
    expect(entity.label).toBe("Apartamento");
    if (entity.kind !== "financing") throw new Error("test: expected financing");
    expect(entity.originalPrincipal.toCents()).toBe(30000000n);
    expect(entity.annualInterestRate.toAnnual().toDecimal()).toBeCloseTo(0.1);
    expect(entity.termMonths).toBe(360);
    expect(entity.amortizationMethod).toBe("SAC");
  });

  it("debt_create (credit_card) discrimina o kind e mapeia limite/fatura/dias", async () => {
    const deps = makeDeps();
    const created = vi.fn(async (e: DebtEntity) => e);
    (deps.debts.create as ReturnType<typeof vi.fn>).mockImplementation(created);

    const r = await executeWrite(deps, {
      toolName: "debt_create",
      userId: "u1",
      isPro: true,
      args: {
        kind: "credit_card",
        label: "Cartão Nubank",
        startDate: "2026-01-01",
        creditLimitCents: 1000000,
        currentStatementCents: 250000,
        statementDay: 5,
        dueDay: 12,
        revolvingBalanceCents: 30000,
        revolvingMonthlyRate: 0.12,
      },
    });

    expect(r.entityType).toBe("debt");
    expect(r.entityId).toBeTruthy();
    expect(r.before).toBeNull();
    expect(r.after).toBeTruthy();
    expect(r.reversible).toBe(true);

    const entity = created.mock.calls[0]![0] as DebtEntity;
    expect(entity.kind).toBe("credit_card");
    if (entity.kind !== "credit_card") throw new Error("test: expected credit_card");
    expect(entity.creditLimit.toCents()).toBe(1000000n);
    expect(entity.currentStatement.toCents()).toBe(250000n);
    expect(entity.statementDay).toBe(5);
    expect(entity.dueDay).toBe(12);
    expect(entity.revolvingBalance?.toCents()).toBe(30000n);
    expect(entity.revolvingMonthlyRate?.toMonthly().toDecimal()).toBeCloseTo(0.12);
    expect(entity.installmentPurchases).toEqual([]);
  });

  it("goal_create (ok) retorna after + reversible", async () => {
    const created: GoalEntity = {
      id: "g1",
      userId: "u1",
      type: "savings",
      title: "Reserva",
      status: "active",
      targetCents: 1000000n,
      deadline: null,
      linkedDebtId: null,
      linkedAssetId: null,
      targetMonths: null,
      fundingMode: "manual",
      manualSavedCents: 0n,
      monthlyCostCents: null,
      realReturnPct: null,
      createdAt: new Date("2026-06-03"),
      updatedAt: new Date("2026-06-03"),
    };
    const deps = makeDeps();
    (deps.goals.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    const r = await executeWrite(deps, {
      toolName: "goal_create",
      userId: "u1",
      isPro: true,
      args: { type: "savings", title: "Reserva", targetCents: 1000000, fundingMode: "manual" },
    });

    expect(r.entityType).toBe("goal");
    expect(r.entityId).toBe("g1");
    expect(r.before).toBeNull();
    expect(r.after?.targetCents).toBe("1000000");
    expect(r.reversible).toBe(true);
  });

  it("goal_create (!ok) lança Error com a mensagem do use-case", async () => {
    const deps = makeDeps();
    (deps.goals.countActive as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    await expect(
      executeWrite(deps, {
        toolName: "goal_create",
        userId: "u1",
        isPro: false,
        args: { type: "savings", title: "Segunda meta" },
      }),
    ).rejects.toThrow("No plano Free");
    expect(deps.goals.create).not.toHaveBeenCalled();
  });
});
