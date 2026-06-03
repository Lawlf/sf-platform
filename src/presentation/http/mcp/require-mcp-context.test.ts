import { describe, expect, it } from "vitest";

import { McpScopeDenied, McpUnauthorized } from "@/domain/errors/mcp-errors";
import type { McpContext } from "@/domain/mcp/mcp-context";

import { assertScope, requireCtxFromExtra } from "./require-mcp-context";

const ctx: McpContext = {
  connectionId: "c1",
  userId: "u1",
  isPro: false,
  scopes: ["assets:read"],
};

describe("assertScope", () => {
  it("passa quando escopo concedido", () => {
    expect(() => assertScope(ctx, "assets:read")).not.toThrow();
  });
  it("lança McpScopeDenied quando ausente", () => {
    expect(() => assertScope(ctx, "assets:write")).toThrow(McpScopeDenied);
  });
});

describe("requireCtxFromExtra", () => {
  it("extrai o ctx de extra.authInfo.extra.mcp", () => {
    const extra = { authInfo: { extra: { mcp: ctx } } };
    expect(requireCtxFromExtra(extra)).toBe(ctx);
  });
  it("lança McpUnauthorized quando extra está ausente", () => {
    expect(() => requireCtxFromExtra(undefined)).toThrow(McpUnauthorized);
  });
  it("lança McpUnauthorized quando authInfo não tem mcp", () => {
    expect(() => requireCtxFromExtra({ authInfo: { extra: {} } })).toThrow(McpUnauthorized);
  });
  it("lança McpUnauthorized quando mcp tem formato inválido", () => {
    expect(() => requireCtxFromExtra({ authInfo: { extra: { mcp: { userId: 1 } } } })).toThrow(
      McpUnauthorized,
    );
  });
});
