import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { loadSimPrefill } from "@/application/use-cases/simulation/load-sim-prefill.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";

import { text } from "./mcp-response";
import { assertScope, requireCtxFromExtra } from "./require-mcp-context";
import { serialize } from "./serialize";
import { SIMULATOR_TOOLS } from "./simulator-registry";

function buildPrefill(userId: string) {
  return loadSimPrefill(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: new DrizzleDebtRepository(),
      incomes: new DrizzleIncomeRepository(),
      clock: new SystemClock(),
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
