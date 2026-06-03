import { McpConnectionRevoked, McpInvalidGrant } from "@/domain/errors/mcp-errors";
import { MCP_ACCESS_TOKEN_TTL_MS, MCP_REFRESH_TOKEN_TTL_MS } from "@/domain/mcp/constants";
import type { Clock } from "@/domain/ports/clock.port";
import type { McpConnectionRepository } from "@/domain/ports/repositories/mcp-connection.repository";
import type { McpTokenRepository } from "@/domain/ports/repositories/mcp-token.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RefreshAccessTokenDeps {
  tokens: Pick<McpTokenRepository, "findRefreshTokenByHash" | "rotateRefreshToken" | "createAccessToken">;
  connections: Pick<McpConnectionRepository, "findById">;
  hasher: Pick<Hasher, "sha256Hex">;
  issueToken: () => Promise<{ raw: string; hash: string }>;
  clock: Clock;
}

export async function refreshAccessToken(
  deps: RefreshAccessTokenDeps,
  input: { refreshToken: string },
): Promise<Result<{ accessToken: string; refreshToken: string; expiresInSec: number }, DomainError>> {
  const now = deps.clock.now();
  const oldHash = await deps.hasher.sha256Hex(input.refreshToken);
  const record = await deps.tokens.findRefreshTokenByHash(oldHash);
  if (!record) return err(new McpInvalidGrant());
  if (record.expiresAt <= now) return err(new McpInvalidGrant());

  const connection = await deps.connections.findById(record.connectionId);
  if (!connection || connection.status !== "active") return err(new McpConnectionRevoked());

  const newRefresh = await deps.issueToken();
  await deps.tokens.rotateRefreshToken(oldHash, {
    tokenHash: newRefresh.hash,
    connectionId: record.connectionId,
    expiresAt: new Date(now.getTime() + MCP_REFRESH_TOKEN_TTL_MS),
  });

  const access = await deps.issueToken();
  await deps.tokens.createAccessToken({
    tokenHash: access.hash,
    connectionId: record.connectionId,
    expiresAt: new Date(now.getTime() + MCP_ACCESS_TOKEN_TTL_MS),
  });

  return ok({
    accessToken: access.raw,
    refreshToken: newRefresh.raw,
    expiresInSec: Math.floor(MCP_ACCESS_TOKEN_TTL_MS / 1000),
  });
}
