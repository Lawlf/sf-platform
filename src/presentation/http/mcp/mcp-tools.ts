import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { repos } from "@/infrastructure/container";
import { resolvePfProfileId } from "@/presentation/http/middleware/active-profile";
import { serialize } from "@/presentation/http/mcp/serialize";

import { registerMcpReadTools } from "./mcp-read-tools";
import { text } from "./mcp-response";
import { registerMcpWriteTools } from "./mcp-write-tools";
import { assertScope, enforceUsageOrThrow, requireCtxFromExtra } from "./require-mcp-context";
import { registerSimulatorTools } from "./simulator-tools";

export function registerMcpTools(server: McpServer): void {
  server.registerTool(
    "accounts_balance",
    { description: "Mostra o saldo e patrimônio do usuário." },
    async (extra) => {
      const ctx = requireCtxFromExtra(extra);
      assertScope(ctx, "assets:read");
      await enforceUsageOrThrow(ctx);
      const assets = await repos.assets.findActiveByUser(ctx.userId);
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
      const profileId = await resolvePfProfileId(ctx.userId);
      const incomes = await repos.incomes.listForProfile(profileId);
      return text(serialize(incomes));
    },
  );

  registerMcpReadTools(server);
  registerMcpWriteTools(server);
  registerSimulatorTools(server);
}
