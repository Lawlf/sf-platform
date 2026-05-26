import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { debtPayments } from "./debt-payments.schema";
import { debts } from "./debts.schema";
import { incomes } from "./incomes.schema";

describe("debts + incomes + debt_payments schema", () => {
  it("declares debts table", () => {
    expect(getTableName(debts)).toBe("debts");
  });
  it("declares incomes table", () => {
    expect(getTableName(incomes)).toBe("incomes");
  });
  it("declares debt_payments table", () => {
    expect(getTableName(debtPayments)).toBe("debt_payments");
  });
  it("debts has kind-discriminator and per-kind columns", () => {
    const cols = Object.keys(debts);
    for (const c of [
      "id",
      "userId",
      "label",
      "kind",
      "status",
      "originalPrincipalCents",
      "currentBalanceCents",
      "startDate",
      "annualRateDecimal",
      "termMonths",
      "amortMethod",
      "creditLimitCents",
      "statementDay",
      "currentStatementCents",
      "revolvingBalanceCents",
      "installmentPurchases",
      "bankName",
      "overdraftMonthlyRateDecimal",
    ]) {
      expect(cols).toContain(c);
    }
  });
});
