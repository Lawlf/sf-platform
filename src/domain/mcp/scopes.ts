export const MCP_SCOPES = [
  "debts:read",
  "debts:write",
  "debts:delete",
  "loans:read",
  "loans:write",
  "loans:delete",
  "assets:read",
  "assets:write",
  "assets:delete",
  "incomes:read",
  "incomes:write",
  "transactions:write",
  "goals:read",
  "goals:write",
  "goals:delete",
  "reports:read",
  "insights:read",
  "achievements:read",
  "simulations:read",
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

export const MCP_SHIPPED_SCOPES = [
  "assets:read",
  "assets:write",
  "assets:delete",
  "incomes:read",
  "incomes:write",
  "transactions:write",
  "debts:read",
  "debts:write",
  "debts:delete",
  "goals:read",
  "goals:write",
  "goals:delete",
  "reports:read",
  "insights:read",
  "achievements:read",
  "simulations:read",
] as const satisfies readonly McpScope[];

export const MCP_SCOPE_DESCRIPTIONS: Record<McpScope, string> = {
  "debts:read": "Ver suas dívidas.",
  "debts:write": "Criar e atualizar dívidas.",
  "debts:delete": "Excluir dívidas.",
  "loans:read": "Ver seus empréstimos.",
  "loans:write": "Criar e atualizar empréstimos.",
  "loans:delete": "Excluir empréstimos.",
  "assets:read": "Ver seu patrimônio.",
  "assets:write": "Criar e atualizar patrimônio.",
  "assets:delete": "Excluir itens de patrimônio.",
  "incomes:read": "Ver suas rendas.",
  "incomes:write": "Criar e atualizar rendas.",
  "transactions:write": "Registrar gastos avulsos.",
  "goals:read": "Ver suas metas.",
  "goals:write": "Criar e atualizar metas.",
  "goals:delete": "Excluir metas.",
  "reports:read": "Gerar relatórios.",
  "insights:read": "Ver anomalias e recomendações.",
  "achievements:read": "Ver suas conquistas.",
  "simulations:read": "Rodar simuladores financeiros (sem alterar seus dados).",
};

const SCOPE_SET = new Set<string>(MCP_SCOPES);

export function isMcpScope(value: string): value is McpScope {
  return SCOPE_SET.has(value);
}

export function parseScopeString(raw: string | null | undefined): McpScope[] {
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .filter(isMcpScope);
}
