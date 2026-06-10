import { McpConnectionRevoked, McpUnauthorized } from "@/domain/errors/mcp-errors";
import type { McpContext } from "@/domain/mcp/mcp-context";
import type { Clock } from "@/domain/ports/clock.port";
import type { McpConnectionRepositoryPort } from "@/domain/ports/repositories/mcp-connection.repository";
import type { McpTokenRepositoryPort } from "@/domain/ports/repositories/mcp-token.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface ResolveMcpContextDeps {
  hasher: Pick<Hasher, "sha256Hex">;
  tokens: Pick<McpTokenRepositoryPort, "findAccessTokenByHash">;
  connections: Pick<McpConnectionRepositoryPort, "findById" | "listScopes" | "touch">;
  users: Pick<UserRepositoryPort, "findById">;
  clock: Clock;
}

export async function resolveMcpContext(
  deps: ResolveMcpContextDeps,
  input: { rawToken: string },
): Promise<Result<McpContext, DomainError>> {
  const now = deps.clock.now();
  const tokenHash = await deps.hasher.sha256Hex(input.rawToken);
  const token = await deps.tokens.findAccessTokenByHash(tokenHash);
  if (!token) return err(new McpUnauthorized());
  if (token.expiresAt <= now) return err(new McpUnauthorized());

  const connection = await deps.connections.findById(token.connectionId);
  if (!connection) return err(new McpUnauthorized());
  if (connection.status !== "active") return err(new McpConnectionRevoked());

  const user = await deps.users.findById(connection.userId);
  if (!user) return err(new McpUnauthorized());

  const scopes = await deps.connections.listScopes(connection.id);
  void deps.connections.touch(connection.id, now);

  return ok({
    connectionId: connection.id,
    userId: user.id,
    isPro: user.isPro,
    scopes,
  });
}
