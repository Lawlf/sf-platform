import type { Money } from "@/domain/value-objects/money.vo";

export type TransactionDirection = "in" | "out";
export type TransactionStatus = "paid" | "scheduled";
export type TransactionSource = "manual" | "open_finance";

/**
 * Fonte de entrada (direction === "in"). Armazenada como string em `category`.
 * "transfer" cobre "Pix de alguém"; "sale" cobre venda.
 */
export type IncomeSource = "salary" | "transfer" | "gift" | "refund" | "sale" | "other";

export const INCOME_SOURCES: readonly IncomeSource[] = [
  "salary",
  "transfer",
  "gift",
  "refund",
  "sale",
  "other",
];

export function isIncomeSource(raw: string): raw is IncomeSource {
  return (INCOME_SOURCES as readonly string[]).includes(raw);
}

export interface TransactionEntity {
  id: string;
  userId: string;
  direction: TransactionDirection;
  amount: Money;
  description: string;
  category: string | null;
  /**
   * Ativo cash (conta/Carteira). Nullable: linhas legadas podem não ter conta.
   * Lançamentos novos sempre recebem uma conta resolvida no use-case.
   */
  accountId: string | null;
  occurredAt: Date;
  /** paid move o saldo da conta; scheduled não (conta a pagar futura). */
  status: TransactionStatus;
  source: TransactionSource;
  /** id do provedor de Open Finance (dedupe futuro). null por ora. */
  externalId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}
