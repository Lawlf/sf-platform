import { describe, expect, it, vi } from "vitest";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { IncomeNotFound } from "@/domain/errors/financial-errors";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { updateIncome } from "./update-income.use-case";

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

function makeClock() {
  return { now: vi.fn(() => new Date("2026-01-15T10:00:00Z")) };
}

function makeAmount(value: number): Money {
  const r = Money.from(value);
  if (!isOk(r)) throw new Error("test setup: invalid money");
  return r.value;
}

function makeExisting(overrides: Partial<IncomeEntity> = {}): IncomeEntity {
  return {
    id: "income-1",
    userId: "user-1",
    profileId: "profile-1",
    label: "Salario",
    amount: makeAmount(5000),
    frequency: "monthly",
    startDate: new Date("2026-01-01"),
    paymentDay: null,
    endDate: null,
    isEstimated: false,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

describe("updateIncome", () => {
  it("applies partial updates and persists", async () => {
    const existing = makeExisting();
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (incomes.update as ReturnType<typeof vi.fn>).mockImplementation(async (e: IncomeEntity) => e);

    const newAmount = makeAmount(6000);
    const result = await updateIncome(
      { incomes, clock },
      { userId: "user-1", incomeId: "income-1", label: "Salario novo", amount: newAmount },
    );

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value.label).toBe("Salario novo");
      expect(result.value.amount).toBe(newAmount);
      expect(result.value.frequency).toBe("monthly"); // unchanged
    }
  });

  it("returns IncomeNotFound when income does not exist", async () => {
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await updateIncome(
      { incomes, clock },
      { userId: "user-1", incomeId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(IncomeNotFound);
    }
    expect(incomes.update).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the income", async () => {
    const existing = makeExisting({ userId: "owner" });
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    const result = await updateIncome(
      { incomes, clock },
      { userId: "intruder", incomeId: "income-1", label: "x" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(incomes.update).not.toHaveBeenCalled();
  });
});
