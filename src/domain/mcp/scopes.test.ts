import { describe, expect, it } from "vitest";

import { MCP_SCOPES, MCP_SCOPE_DESCRIPTIONS, isMcpScope } from "./scopes";

describe("mcp scopes", () => {
  it("toda scope tem descrição", () => {
    for (const scope of MCP_SCOPES) {
      expect(MCP_SCOPE_DESCRIPTIONS[scope]).toBeTruthy();
    }
  });

  it("isMcpScope valida pertencimento", () => {
    expect(isMcpScope("assets:read")).toBe(true);
    expect(isMcpScope("assets:nuke")).toBe(false);
    expect(isMcpScope("")).toBe(false);
  });

  it("não tem toggle global read/write/delete", () => {
    expect(MCP_SCOPES).not.toContain("read");
    expect(MCP_SCOPES).not.toContain("write");
  });
});
