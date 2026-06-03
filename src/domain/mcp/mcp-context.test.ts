import { describe, expect, it } from "vitest";

import type { McpContext } from "./mcp-context";
import { hasScope } from "./mcp-context";

const ctx: McpContext = {
  connectionId: "c1",
  userId: "u1",
  isPro: false,
  scopes: ["assets:read"],
};

describe("hasScope", () => {
  it("true quando concedido", () => {
    expect(hasScope(ctx, "assets:read")).toBe(true);
  });
  it("false quando não concedido", () => {
    expect(hasScope(ctx, "assets:write")).toBe(false);
  });
});
