const TOOL_LABELS: Record<string, string> = {
  income_create: "Registrar renda",
  income_update: "Atualizar renda",
  income_delete: "Excluir renda",
  debt_create: "Registrar dívida",
  debt_update: "Atualizar dívida",
  debt_delete: "Excluir dívida",
  asset_create: "Registrar patrimônio",
  asset_update: "Atualizar patrimônio",
  asset_delete: "Excluir patrimônio",
  goal_create: "Criar meta",
  goal_update: "Atualizar meta",
  goal_delete: "Excluir meta",
};

const ENTITY_LABELS: Record<string, string> = {
  income: "Renda",
  debt: "Dívida",
  asset: "Patrimônio",
  goal: "Meta",
};

export function toolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName;
}

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

export function previewSummary(args: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const label = args.label ?? args.title ?? args.description;
  if (typeof label === "string" && label.trim()) parts.push(label.trim());
  const cents = args.amountCents ?? args.targetCents ?? args.currentValueCents;
  if (typeof cents === "number" && Number.isFinite(cents)) {
    parts.push((cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}
