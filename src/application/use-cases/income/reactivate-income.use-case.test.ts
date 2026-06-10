import { describe, expect, it, vi } from "vitest";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { IncomeAlreadyActive, IncomeNotFound } from "@/domain/errors/financial-errors";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { reactivateIncome } from "./reactivate-income.use-case";

function makeIncomeRepo(): IncomeRepositoryPort {
  return {
    findById: vi.fn(),
    listForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };
}

function makeClock(now = new Date("2026-05-20T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeExisting(overrides: Partial<IncomeEntity> = {}): IncomeEntity {
  const amt = Money.from(1000);
  if (!isOk(amt)) throw new Error("test setup");
  return {
    id: "income-1",
    userId: "user-1",
    label: "Salario",
    amount: amt.value,
    frequency: "monthly",
    startDate: new Date("2026-01-01"),
    paymentDay: null,
    endDate: null,
    isActive: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

describe("reactivateIncome", () => {
  it("calls setActive(true) on the repository for the owner", async () => {
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeExisting());
    (incomes.setActive as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await reactivateIncome(
      { incomes, clock },
      { userId: "user-1", incomeId: "income-1" },
    );

    expect(isOk(result)).toBe(true);
    expect(incomes.setActive).toHaveBeenCalledWith("income-1", true);
  });

  it("returns IncomeNotFound when income does not exist", async () => {
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await reactivateIncome(
      { incomes, clock },
      { userId: "user-1", incomeId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(IncomeNotFound);
    }
    expect(incomes.setActive).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the income", async () => {
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeExisting({ userId: "owner" }),
    );

    const result = await reactivateIncome(
      { incomes, clock },
      { userId: "intruder", incomeId: "income-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(incomes.setActive).not.toHaveBeenCalled();
  });

  it("returns IncomeAlreadyActive when income is already active", async () => {
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeExisting({ isActive: true }),
    );

    const result = await reactivateIncome(
      { incomes, clock },
      { userId: "user-1", incomeId: "income-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(IncomeAlreadyActive);
    }
    expect(incomes.setActive).not.toHaveBeenCalled();
  });
});
