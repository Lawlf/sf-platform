import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { serialize } from "@/presentation/http/mcp/serialize";

import { registerMcpReadTools } from "./mcp-read-tools";
import { registerMcpWriteTools } from "./mcp-write-tools";
import { assertScope, enforceUsageOrThrow, requireCtxFromExtra } from "./require-mcp-context";

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function registerMcpTools(server: McpServer): void {
  server.registerTool(
    "accounts_balance",
    { description: "Mostra o saldo e patrimônio do usuário." },
    async (extra) => {
      const ctx = requireCtxFromExtra(extra);
      assertScope(ctx, "assets:read");
      await enforceUsageOrThrow(ctx);
      const assets = await new DrizzleAssetRepository().findActiveByUser(ctx.userId);
      return text(serialize(assets));
    },
  );

  server.registerTool(
    "incomes_list",
    { description: "Lista suas rendas." },
    async (extra) => {
      const ctx = requireCtxFromExtra(extra);
      assertScope(ctx, "incomes:read");
      await enforceUsageOrThrow(ctx);
      const incomes = await new DrizzleIncomeRepository().listForUser(ctx.userId);
      return text(serialize(incomes));
    },
  );

  registerMcpReadTools(server);
  registerMcpWriteTools(server);
}
