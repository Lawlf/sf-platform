import { describe, expect, it, vi } from "vitest";

import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { isOk } from "@/shared/errors";

import { listDebts } from "./list-debts.use-case";

function makeDebtRepo(): DebtRepository {
  return {
    findById: vi.fn(),
    listForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
  };
}

describe("listDebts", () => {
  it("returns the list and passes through no opts when status is undefined", async () => {
    const debts = makeDebtRepo();
    const data = [{ id: "a" }, { id: "b" }];
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue(data);

    const result = await listDebts({ debts }, { userId: "user-1" });

    expect(result._tag).toBe("ok");
    if (isOk(result)) {
      expect(result.value).toBe(data);
    }
    expect(debts.listForUser).toHaveBeenCalledWith("user-1", undefined);
  });

  it("forwards status filter to the repository when provided", async () => {
    const debts = makeDebtRepo();
    (debts.listForUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listDebts({ debts }, { userId: "user-1", status: "active" });

    expect(debts.listForUser).toHaveBeenCalledWith("user-1", { status: "active" });
  });
});
