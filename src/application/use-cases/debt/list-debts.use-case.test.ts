import { describe, expect, it, vi } from "vitest";

import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { isOk } from "@/shared/errors/result";

import { listDebts } from "./list-debts.use-case";

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

describe("listDebts", () => {
  it("returns the list and passes through no opts when status is undefined", async () => {
    const debts = makeDebtRepo();
    const data = [{ id: "a" }, { id: "b" }];
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue(data);

    const result = await listDebts({ debts }, { profileId: "profile-1" });

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value).toBe(data);
    }
    expect(debts.listForProfile).toHaveBeenCalledWith("profile-1", undefined);
  });

  it("forwards status filter to the repository when provided", async () => {
    const debts = makeDebtRepo();
    (debts.listForProfile as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listDebts({ debts }, { profileId: "profile-1", status: "active" });

    expect(debts.listForProfile).toHaveBeenCalledWith("profile-1", { status: "active" });
  });
});
