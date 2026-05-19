import type { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import type { Money } from "@/domain/value-objects/money.vo";

export type DebtKind = "financing" | "personal_loan" | "credit_card" | "overdraft";
export type DebtStatus = "active" | "paid_off" | "written_off";
export type AmortizationMethod = "PRICE" | "SAC";

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
  creditLimit: Money;
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

export type DebtEntity = FinancingDebt | PersonalLoanDebt | CreditCardDebt | OverdraftDebt;
