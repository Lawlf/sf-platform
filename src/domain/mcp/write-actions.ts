import { MCP_CONFIRMATION_VALUE_THRESHOLD_CENTS } from "./constants";
import type { McpScope } from "./scopes";

export type McpWriteVerb = "create" | "update" | "delete";

export interface McpWriteAction {
  toolName: string;
  entityType: "income" | "transaction" | "debt" | "asset" | "goal";
  verb: McpWriteVerb;
  scope: McpScope;
}

export const MCP_WRITE_ACTIONS: McpWriteAction[] = [
  { toolName: "income_create", entityType: "income", verb: "create", scope: "incomes:write" },
  { toolName: "income_update", entityType: "income", verb: "update", scope: "incomes:write" },
  { toolName: "income_delete", entityType: "income", verb: "delete", scope: "incomes:write" },
  {
    toolName: "transaction_create",
    entityType: "transaction",
    verb: "create",
    scope: "transactions:write",
  },
  { toolName: "debt_create", entityType: "debt", verb: "create", scope: "debts:write" },
  { toolName: "debt_update", entityType: "debt", verb: "update", scope: "debts:write" },
  { toolName: "debt_delete", entityType: "debt", verb: "delete", scope: "debts:delete" },
  { toolName: "asset_create", entityType: "asset", verb: "create", scope: "assets:write" },
  { toolName: "asset_update", entityType: "asset", verb: "update", scope: "assets:write" },
  { toolName: "asset_delete", entityType: "asset", verb: "delete", scope: "assets:delete" },
  { toolName: "goal_create", entityType: "goal", verb: "create", scope: "goals:write" },
  { toolName: "goal_update", entityType: "goal", verb: "update", scope: "goals:write" },
  { toolName: "goal_delete", entityType: "goal", verb: "delete", scope: "goals:delete" },
];

export function findWriteAction(toolName: string): McpWriteAction | undefined {
  return MCP_WRITE_ACTIONS.find((a) => a.toolName === toolName);
}

export function requiresConfirmation(verb: McpWriteVerb, maxAmountCents: number): boolean {
  if (verb === "delete") return true;
  return maxAmountCents >= MCP_CONFIRMATION_VALUE_THRESHOLD_CENTS;
}
