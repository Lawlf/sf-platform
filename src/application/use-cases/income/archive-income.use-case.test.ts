import { describe, expect, it, vi } from "vitest";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { IncomeNotFound } from "@/domain/errors/financial-errors";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr, isOk } from "@/shared/errors/result";

import { archiveIncome } from "./archive-income.use-case";

function makeIncomeRepo(): IncomeRepository {
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

function makeExisting(userId = "user-1"): IncomeEntity {
  const amt = Money.from(1000);
  if (!isOk(amt)) throw new Error("test setup");
  return {
    id: "income-1",
    userId,
    label: "Salario",
    amount: amt.value,
    frequency: "monthly",
    startDate: new Date("2026-01-01"),
    endDate: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
  };
}

describe("archiveIncome", () => {
  it("calls setActive(false) on the repository for the owner", async () => {
    const incomes = makeIncomeRepo();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeExisting("user-1"));
    (incomes.setActive as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await archiveIncome({ incomes }, { userId: "user-1", incomeId: "income-1" });

    expect(result._tag).toBe("ok");
    expect(incomes.setActive).toHaveBeenCalledWith("income-1", false);
  });

  it("returns IncomeNotFound when income does not exist", async () => {
    const incomes = makeIncomeRepo();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await archiveIncome({ incomes }, { userId: "user-1", incomeId: "missing" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(IncomeNotFound);
    }
    expect(incomes.setActive).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the income", async () => {
    const incomes = makeIncomeRepo();
    (incomes.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeExisting("owner"));

    const result = await archiveIncome({ incomes }, { userId: "intruder", incomeId: "income-1" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(incomes.setActive).not.toHaveBeenCalled();
  });
});
