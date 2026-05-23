import type {
  DebtEntity,
  ExpenseCategory,
  InstallmentPurchase,
  RecurringFrequency,
} from "@/domain/entities/debt.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { ok, type Result } from "@/shared/errors";

export interface RegisterDebtDeps {
  debts: DebtRepository;
  clock: Clock;
}

// Input is a "raw form" version of DebtEntity, MINUS id/userId/createdAt/updatedAt/status/currentBalance.
// Use case sets id (uuid), status="active", currentBalance=originalPrincipal initially.
//
// O kind `recurring` foi introduzido no merge Expense -> Debt. Ele modela
// compromissos sem cálculo de juros: fluxo de caixa periódico (mensal/semanal).
// `userId`, `label`, `startDate` continuam compartilhados. `notes` é opcional
// nessa variante; os legados continuam com `notes: string | null`.
export type RegisterDebtInput =
  | ({
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
          // Ongoing: saldo atual difere do principal contratado.
          currentBalance?: Money | null;
        }
      | {
          kind: "personal_loan";
          originalPrincipal: Money;
          annualInterestRate: InterestRate;
          termMonths: number;
          monthlyInstallment: Money;
          // Ongoing: saldo devedor atual já diferente do principal original.
          // Se omitido, assume contrato novo (currentBalance = originalPrincipal).
          currentBalance?: Money | null;
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
    ))
  | {
      kind: "recurring";
      userId: string;
      label: string;
      recurringFrequency: RecurringFrequency;
      recurringAmountCents: bigint;
      expenseCategory: ExpenseCategory;
      startDate: Date;
      endDate?: Date | null;
      notes?: string | undefined;
      dueDay?: number | null;
    };

export async function registerDebt(
  deps: RegisterDebtDeps,
  input: RegisterDebtInput,
): Promise<Result<DebtEntity, never>> {
  const now = deps.clock.now();

  let entity: DebtEntity;
  switch (input.kind) {
    case "financing": {
      const base = legacyBase(input, now);
      entity = {
        ...base,
        kind: "financing",
        originalPrincipal: input.originalPrincipal,
        currentBalance: input.currentBalance ?? input.originalPrincipal,
        amortizationMethod: input.amortizationMethod,
        annualInterestRate: input.annualInterestRate,
        termMonths: input.termMonths,
        monthlyInsurance: input.monthlyInsurance,
        monthlyAdminFee: input.monthlyAdminFee,
      };
      break;
    }
    case "personal_loan": {
      const base = legacyBase(input, now);
      entity = {
        ...base,
        kind: "personal_loan",
        originalPrincipal: input.originalPrincipal,
        currentBalance: input.currentBalance ?? input.originalPrincipal,
        annualInterestRate: input.annualInterestRate,
        termMonths: input.termMonths,
        monthlyInstallment: input.monthlyInstallment,
      };
      break;
    }
    case "credit_card": {
      const base = legacyBase(input, now);
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
    }
    case "overdraft": {
      const base = legacyBase(input, now);
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
    case "recurring": {
      // Compromisso recorrente: `recurringAmountCents` é só um marcador do
      // valor por período. `currentBalance` fica em zero porque não há saldo
      // devedor projetável; o app trata a vista como fluxo de caixa.
      const principalMoney = Money.fromCents(input.recurringAmountCents);
      entity = {
        id: crypto.randomUUID(),
        userId: input.userId,
        label: input.label,
        status: "active",
        originalPrincipal: principalMoney,
        currentBalance: Money.zero(),
        startDate: input.startDate,
        expectedEndDate: input.endDate ?? null,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        kind: "recurring",
        recurringFrequency: input.recurringFrequency,
        recurringAmountCents: input.recurringAmountCents,
        expenseCategory: input.expenseCategory,
        dueDay: input.dueDay ?? null,
      };
      break;
    }
  }

  const persisted = await deps.debts.create(entity);
  return ok(persisted);
}

interface LegacyBaseInput {
  userId: string;
  label: string;
  notes: string | null;
  startDate: Date;
  expectedEndDate: Date | null;
}

function legacyBase(input: LegacyBaseInput, now: Date) {
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    label: input.label,
    status: "active" as const,
    startDate: input.startDate,
    expectedEndDate: input.expectedEndDate,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    // Campos do merge Expense -> Debt. Dívidas tradicionais não usam.
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}
