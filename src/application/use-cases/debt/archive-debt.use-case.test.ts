import { describe, expect, it, vi } from "vitest";

import type { PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isErr } from "@/shared/errors";

import { archiveDebt } from "./archive-debt.use-case";

function makeDebtRepo(): DebtRepository {
  return {
    findById: vi.fn(),
    listForUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
  };
}

function makeDebt(userId = "user-1"): PersonalLoanDebt {
  const moneyR = Money.from(1000);
  const rateR = InterestRate.fromAnnual(0.2);
  if (moneyR._tag !== "ok" || rateR._tag !== "ok") throw new Error("test setup");
  return {
    id: "debt-1",
    userId,
    label: "Test",
    status: "active",
    originalPrincipal: moneyR.value,
    currentBalance: moneyR.value,
    startDate: new Date("2026-01-01"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    kind: "personal_loan",
    annualInterestRate: rateR.value,
    termMonths: 6,
    monthlyInstallment: moneyR.value,
  };
}

describe("archiveDebt", () => {
  it("calls setStatus with provided reason for the owner", async () => {
    const debts = makeDebtRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt("user-1"));
    (debts.setStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await archiveDebt(
      { debts },
      { userId: "user-1", debtId: "debt-1", reason: "paid_off" },
    );

    expect(result._tag).toBe("ok");
    expect(debts.setStatus).toHaveBeenCalledWith("debt-1", "paid_off");
  });

  it("returns DebtNotFound when debt does not exist", async () => {
    const debts = makeDebtRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await archiveDebt(
      { debts },
      { userId: "user-1", debtId: "missing", reason: "written_off" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(DebtNotFound);
    }
    expect(debts.setStatus).not.toHaveBeenCalled();
  });

  it("returns Forbidden when caller does not own the debt", async () => {
    const debts = makeDebtRepo();
    (debts.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeDebt("owner"));

    const result = await archiveDebt(
      { debts },
      { userId: "intruder", debtId: "debt-1", reason: "paid_off" },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(Forbidden);
    }
    expect(debts.setStatus).not.toHaveBeenCalled();
  });
});
