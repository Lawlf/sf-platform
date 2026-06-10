import { checkAndIncrementMcpUsage } from "@/application/use-cases/mcp/check-mcp-usage.use-case";
import { resolveMcpContext } from "@/application/use-cases/mcp/resolve-mcp-context.use-case";
import { McpScopeDenied, McpUnauthorized } from "@/domain/errors/mcp-errors";
import type { McpContext } from "@/domain/mcp/mcp-context";
import { hasScope } from "@/domain/mcp/mcp-context";
import type { McpScope } from "@/domain/mcp/scopes";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { clock, repos } from "@/infrastructure/container";
import { isErr } from "@/shared/errors/result";

export function assertScope(ctx: McpContext, scope: McpScope): void {
  if (!hasScope(ctx, scope)) throw new McpScopeDenied(scope);
}

interface ExtraWithAuth {
  authInfo?: { extra?: { mcp?: unknown } };
}

export function requireCtxFromExtra(extra: unknown): McpContext {
  const ctx = (extra as ExtraWithAuth | undefined)?.authInfo?.extra?.mcp;
  if (!isMcpContext(ctx)) throw new McpUnauthorized();
  return ctx;
}

function isMcpContext(value: unknown): value is McpContext {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.connectionId === "string" &&
    typeof c.userId === "string" &&
    typeof c.isPro === "boolean" &&
    Array.isArray(c.scopes)
  );
}

export async function resolveMcpContextFromToken(rawToken: string): Promise<McpContext | null> {
  const result = await resolveMcpContext(
    {
      hasher: new WebCryptoHasher(),
      tokens: repos.mcpTokens,
      connections: repos.mcpConnections,
      users: repos.users,
      clock,
    },
    { rawToken },
  );
  if (isErr(result)) return null;
  return result.value;
}

export async function enforceUsageOrThrow(ctx: McpContext): Promise<void> {
  const result = await checkAndIncrementMcpUsage(
    { usage: repos.mcpUsage, clock },
    { userId: ctx.userId, isPro: ctx.isPro },
  );
  if (isErr(result)) throw result.error;
}
