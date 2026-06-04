import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";

import { SIMULATOR_TOOLS } from "./simulator-registry";
import { registerSimulatorTools } from "./simulator-tools";

vi.mock("@/application/use-cases/simulation/load-sim-prefill.use-case", () => ({
  loadSimPrefill: vi.fn(async () => ({
    investedCents: "0",
    cashReserveCents: "0",
    contributionCents: "0",
    incomeCents: "0",
    monthlyServiceCents: "0",
  })),
}));

type Handler = (a: Record<string, unknown>, e: unknown) => Promise<unknown>;

function fakeServer() {
  const tools = new Map<string, { handler: Handler }>();
  const server = {
    tools,
    registerTool: (name: string, _def: unknown, handler: Handler) =>
      void tools.set(name, { handler }),
  };
  return server;
}

const extraWith = (scopes: string[]) => ({
  authInfo: { extra: { mcp: { connectionId: "c1", userId: "u1", isPro: false, scopes } } },
});

describe("registerSimulatorTools", () => {
  it("registra uma tool por entrada do registry", () => {
    const s = fakeServer();
    registerSimulatorTools(s as unknown as McpServer);
    expect(s.tools.size).toBe(SIMULATOR_TOOLS.length);
  });

  it("nega sem o escopo simulations:read", async () => {
    const s = fakeServer();
    registerSimulatorTools(s as unknown as McpServer);
    const tool = s.tools.get("simulate_compound_growth")!;
    await expect(
      tool.handler(
        { monthlyContributionCents: 100000, annualRatePct: 10, years: 5 },
        extraWith([]),
      ),
    ).rejects.toThrow();
  });

  it("roda um simulador puro com escopo concedido", async () => {
    const s = fakeServer();
    registerSimulatorTools(s as unknown as McpServer);
    const tool = s.tools.get("simulate_compound_growth")!;
    const out = await tool.handler(
      { initialCents: 0, monthlyContributionCents: 100000, annualRatePct: 10, years: 5 },
      extraWith(["simulations:read"]),
    );
    expect(JSON.stringify(out)).toContain("finalCents");
  });
});
