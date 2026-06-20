import { describe, expect, it, vi } from "vitest";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { IncomeNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { deleteIncome } from "./delete-income.use-case";

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

function makeClock(now = new Date("2026-05-21T10:00:00Z")): Clock {
  return { now: vi.fn(() => now) };
}

function makeIncome(userId = "user-1"): IncomeEntity {
  const amt = Money.from(1000);
  if (!isOk(amt)) throw new Error("test setup");
  return {
    id: "income-1",
    userId,
    profileId: "profile-1",
    label: "Salario",
    amount: amt.value,
    frequency: "monthly",
    startDate: new Date("2026-01-01"),
    paymentDay: null,
    endDate: null,
    isEstimated: false,
    sourceBreakdown: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
  };
}

describe("deleteIncome", () => {
  it("soft-deletes the income for the owner", async () => {
    const incomes = makeIncomeRepo();
    const now = new Date("2026-05-21T10:00:00Z");
    const clock = makeClock(now);
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeIncome("user-1"));

    const result = await deleteIncome(
      { incomes, clock },
      { userId: "user-1", profileId: "profile-1", incomeId: "income-1" },
    );

    expect(isOk(result)).toBe(true);
    expect(incomes.softDelete).toHaveBeenCalledWith("income-1", now);
  });

  it("returns IncomeNotFound when income does not exist", async () => {
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await deleteIncome(
      { incomes, clock },
      { userId: "user-1", profileId: "profile-1", incomeId: "missing" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(IncomeNotFound);
    }
    expect(incomes.softDelete).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the income", async () => {
    const incomes = makeIncomeRepo();
    const clock = makeClock();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeIncome("owner"));

    const result = await deleteIncome(
      { incomes, clock },
      { userId: "intruder", profileId: "profile-2", incomeId: "income-1" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(incomes.softDelete).not.toHaveBeenCalled();
  });
});
