import type {
  DebtEntity,
  ExpenseCategory,
  InstallmentPurchase,
  RecurringFrequency,
} from "@/domain/entities/debt.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import { DebtNotFound } from "@/domain/errors/financial-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import type { Money } from "@/domain/value-objects/money.vo";
import { err, ok, type Result } from "@/shared/errors/result";

export interface UpdateDebtDeps {
  debts: DebtRepositoryPort;
  clock: Clock;
}

export interface UpdateDebtInput {
  userId: string;
  profileId: string;
  debtId: string;
  // Common fields editable for any kind.
  label?: string;
  notes?: string | null;
  expectedEndDate?: Date | null;
  startDate?: Date;
  // Per-kind editable fields (ignored when kind doesn't apply).
  currentBalance?: Money;
  annualInterestRate?: InterestRate;
  monthlyInstallment?: Money;
  monthlyInsurance?: Money | null;
  monthlyAdminFee?: Money | null;
  creditLimit?: Money | null;
  currentStatement?: Money;
  statementDay?: number;
  dueDay?: number;
  revolvingBalance?: Money | null;
  revolvingMonthlyRate?: InterestRate | null;
  installmentPurchases?: InstallmentPurchase[];
  bankName?: string;
  monthlyRate?: InterestRate;
  recurringAmountCents?: bigint;
  recurringFrequency?: RecurringFrequency;
  expenseCategory?: ExpenseCategory;
}

export async function updateDebt(
  deps: UpdateDebtDeps,
  input: UpdateDebtInput,
): Promise<Result<DebtEntity, DebtNotFound | Forbidden>> {
  const existing = await deps.debts.findById(input.debtId);
  if (!existing) return err(new DebtNotFound("Dívida não encontrada."));
  if (existing.profileId !== input.profileId) return err(new Forbidden("Acesso negado."));

  const now = deps.clock.now();
  const baseChanges = {
    ...(input.label !== undefined && { label: input.label }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.expectedEndDate !== undefined && { expectedEndDate: input.expectedEndDate }),
    ...(input.startDate !== undefined && { startDate: input.startDate }),
    updatedAt: now,
  };

  let next: DebtEntity;
  switch (existing.kind) {
    case "financing":
      next = {
        ...existing,
        ...baseChanges,
        ...(input.currentBalance !== undefined && { currentBalance: input.currentBalance }),
        ...(input.annualInterestRate !== undefined && {
          annualInterestRate: input.annualInterestRate,
        }),
        ...(input.monthlyInsurance !== undefined && { monthlyInsurance: input.monthlyInsurance }),
        ...(input.monthlyAdminFee !== undefined && { monthlyAdminFee: input.monthlyAdminFee }),
      };
      break;
    case "personal_loan":
      next = {
        ...existing,
        ...baseChanges,
        ...(input.currentBalance !== undefined && { currentBalance: input.currentBalance }),
        ...(input.annualInterestRate !== undefined && {
          annualInterestRate: input.annualInterestRate,
        }),
        ...(input.monthlyInstallment !== undefined && {
          monthlyInstallment: input.monthlyInstallment,
        }),
        ...(input.dueDay !== undefined && { dueDay: input.dueDay }),
      };
      break;
    case "credit_card":
      next = {
        ...existing,
        ...baseChanges,
        ...(input.creditLimit !== undefined && { creditLimit: input.creditLimit }),
        ...(input.currentStatement !== undefined && { currentStatement: input.currentStatement }),
        ...(input.currentBalance !== undefined && { currentBalance: input.currentBalance }),
        ...(input.statementDay !== undefined && { statementDay: input.statementDay }),
        ...(input.dueDay !== undefined && { dueDay: input.dueDay }),
        ...(input.revolvingBalance !== undefined && { revolvingBalance: input.revolvingBalance }),
        ...(input.revolvingMonthlyRate !== undefined && {
          revolvingMonthlyRate: input.revolvingMonthlyRate,
        }),
        ...(input.installmentPurchases !== undefined && {
          installmentPurchases: input.installmentPurchases,
        }),
      };
      break;
    case "overdraft":
      next = {
        ...existing,
        ...baseChanges,
        ...(input.currentBalance !== undefined && { currentBalance: input.currentBalance }),
        ...(input.bankName !== undefined && { bankName: input.bankName }),
        ...(input.monthlyRate !== undefined && { monthlyRate: input.monthlyRate }),
      };
      break;
    case "recurring":
      next = {
        ...existing,
        ...baseChanges,
        ...(input.recurringAmountCents !== undefined && {
          recurringAmountCents: input.recurringAmountCents,
        }),
        ...(input.recurringFrequency !== undefined && {
          recurringFrequency: input.recurringFrequency,
        }),
        ...(input.expenseCategory !== undefined && { expenseCategory: input.expenseCategory }),
        ...(input.dueDay !== undefined && { dueDay: input.dueDay }),
      };
      break;
  }

  const persisted = await deps.debts.update(next);
  return ok(persisted);
}
