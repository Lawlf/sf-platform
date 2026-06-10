import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { loadSimPrefill } from "@/application/use-cases/simulation/load-sim-prefill.use-case";
import { clock, repos } from "@/infrastructure/container";


import { text } from "./mcp-response";
import { assertScope, requireCtxFromExtra } from "./require-mcp-context";
import { serialize } from "./serialize";
import { SIMULATOR_TOOLS } from "./simulator-registry";

function buildPrefill(userId: string) {
  return loadSimPrefill(
    {
      assets: repos.assets,
      allocations: repos.assetDebtAllocations,
      debts: repos.debts,
      incomes: repos.incomes,
      clock,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
    },
    { userId },
  );
}

export function registerSimulatorTools(server: McpServer): void {
  for (const def of SIMULATOR_TOOLS) {
    server.registerTool(
      def.toolName,
      { description: def.description, inputSchema: def.inputSchema },
      async (args, extra) => {
        const ctx = requireCtxFromExtra(extra);
        assertScope(ctx, "simulations:read");
        let merged = args;
        if (def.prefill) {
          const prefill = await buildPrefill(ctx.userId);
          merged = { ...def.prefill(prefill, args), ...args };
        }
        const result = await def.execute(merged, ctx);
        return text(serialize(result));
      },
    );
  }
}
