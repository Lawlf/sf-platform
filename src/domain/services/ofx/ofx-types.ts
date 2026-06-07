export interface OfxTxn {
  fitId: string;
  postedAt: Date;
  amountCents: bigint;
  direction: "in" | "out";
  memo: string;
}

export interface OfxStatement {
  accountKey: string;
  currency: string;
  ledgerBalanceCents: bigint;
  transactions: OfxTxn[];
}

export type OfxParseError =
  | { kind: "empty" }
  | { kind: "no_statement" }
  | { kind: "malformed"; detail: string };

export interface IncomeSuggestion {
  label: string;
  amountCents: bigint;
  dayOfMonth: number;
  occurrences: number;
  fitIds: string[];
}

export interface DebtSuggestion {
  label: string;
  installmentCents: bigint;
  installmentsTotal: number | null;
  installmentsPaid: number | null;
  fitIds: string[];
}

export interface OfxSuggestions {
  incomes: IncomeSuggestion[];
  debts: DebtSuggestion[];
}
