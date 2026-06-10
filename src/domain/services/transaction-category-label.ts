const SYSTEM_LABELS: Record<string, string> = {
  internal_transfer: "Transferência",
  promoted_debt: "Virou dívida",
  promoted_income: "Virou renda",
};

/**
 * Rótulo humano da categoria de uma transação. Enums de sistema viram PT-BR;
 * categoria nula vira null (a UI omite, não mostra "Sem categoria" como rótulo);
 * rótulos manuais (já em PT-BR) passam direto.
 */
export function transactionCategoryLabel(category: string | null): string | null {
  if (!category) return null;
  return SYSTEM_LABELS[category] ?? category;
}
