import { describe, expect, it, vi } from "vitest";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors";

import { listIncomes } from "./list-incomes.use-case";

function makeIncomeRepo(): IncomeRepository {
  return {
    findById: vi.fn(),
    listForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setActive: vi.fn(),
    softDelete: vi.fn(),
  };
}

function makeIncome(id: string): IncomeEntity {
  const amt = Money.from(1000);
  if (!isOk(amt)) throw new Error("test setup");
  return {
    id,
    userId: "user-1",
    label: `Income ${id}`,
    amount: amt.value,
    frequency: "monthly",
    startDate: new Date("2026-01-01"),
    endDate: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
  };
}

describe("listIncomes", () => {
  it("returns the repository list for the user", async () => {
    const incomes = makeIncomeRepo();
    const list = [makeIncome("a"), makeIncome("b")];
    (incomes.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue(list);

    const result = await listIncomes({ incomes }, { userId: "user-1" });

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value).toBe(list);
    }
    expect(incomes.listForUser).toHaveBeenCalledWith("user-1", undefined);
  });

  it("forwards onlyActive option to the repository when provided", async () => {
    const incomes = makeIncomeRepo();
    (incomes.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listIncomes({ incomes }, { userId: "user-1", onlyActive: true });

    expect(incomes.listForUser).toHaveBeenCalledWith("user-1", { onlyActive: true });
  });
});
