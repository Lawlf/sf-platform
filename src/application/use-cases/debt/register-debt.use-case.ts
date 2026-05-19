import type { DebtEntity, InstallmentPurchase } from "@/domain/entities/debt.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import type { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors";

export interface RegisterDebtDeps {
  debts: DebtRepository;
  clock: Clock;
}

// Input is a "raw form" version of DebtEntity, MINUS id/userId/createdAt/updatedAt/status/currentBalance.
// Use case sets id (uuid), status="active", currentBalance=originalPrincipal initially.
export type RegisterDebtInput = {
  userId: string;
  label: string;
  notes: string | null;
  startDate: Date;
  expectedEndDate: Date | null;
} & (
  | {
      kind: "financing";
      originalPrincipal: Money;
      annualInterestRate: InterestRate;
      termMonths: number;
      amortizationMethod: "PRICE" | "SAC";
      monthlyInsurance: Money | null;
      monthlyAdminFee: Money | null;
    }
  | {
      kind: "personal_loan";
      originalPrincipal: Money;
      annualInterestRate: InterestRate;
      termMonths: number;
      monthlyInstallment: Money;
    }
  | {
      kind: "credit_card";
      creditLimit: Money;
      currentStatement: Money;
      statementDay: number;
      dueDay: number;
      revolvingBalance: Money | null;
      revolvingMonthlyRate: InterestRate | null;
      installmentPurchases: InstallmentPurchase[];
    }
  | {
      kind: "overdraft";
      currentBalance: Money;
      bankName: string;
      monthlyRate: InterestRate;
    }
);

export async function registerDebt(
  deps: RegisterDebtDeps,
  input: RegisterDebtInput,
): Promise<Result<DebtEntity, never>> {
  const now = deps.clock.now();
  const base = {
    id: crypto.randomUUID(),
    userId: input.userId,
    label: input.label,
    status: "active" as const,
    startDate: input.startDate,
    expectedEndDate: input.expectedEndDate,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  let entity: DebtEntity;
  switch (input.kind) {
    case "financing":
      entity = {
        ...base,
        kind: "financing",
        originalPrincipal: input.originalPrincipal,
        currentBalance: input.originalPrincipal,
        amortizationMethod: input.amortizationMethod,
        annualInterestRate: input.annualInterestRate,
        termMonths: input.termMonths,
        monthlyInsurance: input.monthlyInsurance,
        monthlyAdminFee: input.monthlyAdminFee,
      };
      break;
    case "personal_loan":
      entity = {
        ...base,
        kind: "personal_loan",
        originalPrincipal: input.originalPrincipal,
        currentBalance: input.originalPrincipal,
        annualInterestRate: input.annualInterestRate,
        termMonths: input.termMonths,
        monthlyInstallment: input.monthlyInstallment,
      };
      break;
    case "credit_card":
      entity = {
        ...base,
        kind: "credit_card",
        originalPrincipal: input.currentStatement,
        currentBalance: input.revolvingBalance
          ? input.currentStatement.add(input.revolvingBalance)
          : input.currentStatement,
        creditLimit: input.creditLimit,
        statementDay: input.statementDay,
        dueDay: input.dueDay,
        currentStatement: input.currentStatement,
        revolvingBalance: input.revolvingBalance,
        revolvingMonthlyRate: input.revolvingMonthlyRate,
        installmentPurchases: input.installmentPurchases,
      };
      break;
    case "overdraft":
      entity = {
        ...base,
        kind: "overdraft",
        originalPrincipal: input.currentBalance,
        currentBalance: input.currentBalance,
        bankName: input.bankName,
        monthlyRate: input.monthlyRate,
        lastChargeDate: null,
      };
      break;
  }

  const persisted = await deps.debts.create(entity);
  return ok(persisted);
}
