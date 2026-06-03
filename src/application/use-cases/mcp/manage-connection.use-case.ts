import { McpUnauthorized } from "@/domain/errors/mcp-errors";
import type { McpScope } from "@/domain/mcp/scopes";
import type { Clock } from "@/domain/ports/clock.port";
import type { McpConnectionRepository } from "@/domain/ports/repositories/mcp-connection.repository";
import type { McpTokenRepository } from "@/domain/ports/repositories/mcp-token.repository";
import type { DomainError } from "@/shared/errors/domain-error";
import { err, isErr, ok, type Result } from "@/shared/errors/result";

export interface ManageConnectionDeps {
  connections: Pick<McpConnectionRepository, "findById" | "revoke" | "addScope" | "removeScope">;
  tokens: Pick<McpTokenRepository, "deleteForConnection">;
  clock: Clock;
}

async function assertOwner(
  deps: ManageConnectionDeps,
  userId: string,
  connectionId: string,
): Promise<Result<void, DomainError>> {
  const connection = await deps.connections.findById(connectionId);
  if (!connection || connection.userId !== userId) {
    return err(new McpUnauthorized("Conexão não encontrada."));
  }
  return ok(undefined);
}

export async function revokeConnection(
  deps: ManageConnectionDeps,
  input: { userId: string; connectionId: string },
): Promise<Result<void, DomainError>> {
  const owner = await assertOwner(deps, input.userId, input.connectionId);
  if (isErr(owner)) return owner;
  await deps.connections.revoke(input.connectionId, deps.clock.now());
  await deps.tokens.deleteForConnection(input.connectionId);
  return ok(undefined);
}

export async function setConnectionScope(
  deps: ManageConnectionDeps,
  input: { userId: string; connectionId: string; scope: McpScope; grant: boolean },
): Promise<Result<void, DomainError>> {
  const owner = await assertOwner(deps, input.userId, input.connectionId);
  if (isErr(owner)) return owner;
  if (input.grant) await deps.connections.addScope(input.connectionId, input.scope);
  else await deps.connections.removeScope(input.connectionId, input.scope);
  return ok(undefined);
}
