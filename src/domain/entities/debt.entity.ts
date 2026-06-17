import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import type { Money } from "@/domain/value-objects/money.vo";

export type DebtKind = "financing" | "personal_loan" | "credit_card" | "overdraft" | "recurring";
export type DebtStatus = "active" | "paid_off" | "written_off";
export type AmortizationMethod = "PRICE" | "SAC";

export type ExpenseCategory = string;

export type RecurringFrequency = "monthly" | "weekly" | "annual";

interface BaseDebt {
  id: string;
  userId: string;
  label: string;
  status: DebtStatus;
  originalPrincipal: Money;
  currentBalance: Money;
  startDate: Date;
  expectedEndDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Soft delete. `null` em dívidas ativas (status legítimo qualquer:
   * active/paid_off/written_off). Quando preenchido, a dívida foi apagada
   * pelo usuário e some das listas. Os sub-records (debt_payments,
   * asset_debt_allocations) são hard-deletados na mesma operação.
   */
  deletedAt: Date | null;
  // Campos opcionais introduzidos no merge Expense -> Debt. Sempre `null`
  // para dívidas tradicionais (financing/personal_loan/credit_card/overdraft).
  recurringFrequency: RecurringFrequency | null;
  recurringAmountCents: bigint | null;
  expenseCategory: ExpenseCategory | null;
}

export interface FinancingDebt extends BaseDebt {
  kind: "financing";
  amortizationMethod: AmortizationMethod;
  annualInterestRate: InterestRate;
  termMonths: number;
  monthlyInsurance: Money | null;
  monthlyAdminFee: Money | null;
}

export interface PersonalLoanDebt extends BaseDebt {
  kind: "personal_loan";
  annualInterestRate: InterestRate;
  termMonths: number;
  monthlyInstallment: Money;
  // Dia do mês (1-31) em que a parcela sai da conta. `null` cai pro dia de
  // `startDate` na geração do lembrete de vencimento.
  dueDay: number | null;
}

export interface InstallmentPurchase {
  description: string;
  total: Money;
  installmentsTotal: number;
  installmentsRemaining: number;
  monthlyValue: Money;
}

export interface CreditCardDebt extends BaseDebt {
  kind: "credit_card";
  creditLimit: Money | null;
  statementDay: number;
  dueDay: number;
  currentStatement: Money;
  revolvingBalance: Money | null;
  revolvingMonthlyRate: InterestRate | null;
  installmentPurchases: InstallmentPurchase[];
}

export interface OverdraftDebt extends BaseDebt {
  kind: "overdraft";
  bankName: string;
  monthlyRate: InterestRate;
  lastChargeDate: Date | null;
}

/**
 * Compromisso recorrente estilo Netflix/aluguel. Valor por período é
 * `recurringAmountCents`. Não usa `currentBalance` para projeção; o saldo
 * é informativo (geralmente 0).
 */
export interface RecurringDebt extends BaseDebt {
  kind: "recurring";
  recurringFrequency: RecurringFrequency;
  recurringAmountCents: bigint;
  expenseCategory: ExpenseCategory;
  // Dia do mês em que o compromisso vence (1-31). `null` significa "use o dia
  // de `startDate`". Só faz sentido pra `recurringFrequency === "monthly"`.
  dueDay: number | null;
}

export type DebtEntity =
  | FinancingDebt
  | PersonalLoanDebt
  | CreditCardDebt
  | OverdraftDebt
  | RecurringDebt;
