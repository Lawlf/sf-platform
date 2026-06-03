import { describe, expect, it } from "vitest";

import { MCP_WRITE_ACTIONS, requiresConfirmation } from "./write-actions";

describe("write-actions", () => {
  it("toda ação tem escopo e verbo", () => {
    for (const a of MCP_WRITE_ACTIONS) {
      expect(a.scope).toBeTruthy();
      expect(["create", "update", "delete"]).toContain(a.verb);
    }
  });
  it("delete sempre exige confirmação", () => {
    expect(requiresConfirmation("delete", 0)).toBe(true);
  });
  it("create/update de baixo valor não exige", () => {
    expect(requiresConfirmation("create", 100_00)).toBe(false);
  });
  it("create/update acima do limite exige", () => {
    expect(requiresConfirmation("update", 500_000)).toBe(true);
  });
});
