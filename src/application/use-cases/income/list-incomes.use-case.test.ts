import { describe, expect, it, vi } from "vitest";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { listIncomes } from "./list-incomes.use-case";

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

function makeIncome(id: string): IncomeEntity {
  const amt = Money.from(1000);
  if (!isOk(amt)) throw new Error("test setup");
  return {
    id,
    userId: "user-1",
    profileId: "profile-1",
    label: `Income ${id}`,
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

describe("listIncomes", () => {
  it("returns the repository list for the user", async () => {
    const incomes = makeIncomeRepo();
    const list = [makeIncome("a"), makeIncome("b")];
    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue(list);

    const result = await listIncomes({ incomes }, { profileId: "profile-1" });

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value).toBe(list);
    }
    expect(incomes.listForProfile).toHaveBeenCalledWith("profile-1", undefined);
  });

  it("forwards onlyActive option to the repository when provided", async () => {
    const incomes = makeIncomeRepo();
    (incomes.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listIncomes({ incomes }, { profileId: "profile-1", onlyActive: true });

    expect(incomes.listForProfile).toHaveBeenCalledWith("profile-1", { onlyActive: true });
  });
});
