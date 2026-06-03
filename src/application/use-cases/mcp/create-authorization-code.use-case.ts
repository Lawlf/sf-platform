import { McpInvalidClient, McpInvalidGrant } from "@/domain/errors/mcp-errors";
import { MCP_AUTH_CODE_TTL_MS } from "@/domain/mcp/constants";
import type { McpScope } from "@/domain/mcp/scopes";
import type { Clock } from "@/domain/ports/clock.port";
import type { McpAuthorizationCodeRepository } from "@/domain/ports/repositories/mcp-authorization-code.repository";
import type { McpOauthClientRepository } from "@/domain/ports/repositories/mcp-oauth-client.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { RandomGenerator } from "@/domain/ports/services/random-generator.service";
import type { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CreateAuthorizationCodeDeps {
  clients: Pick<McpOauthClientRepository, "findByClientId">;
  codes: Pick<McpAuthorizationCodeRepository, "create">;
  hasher: Pick<Hasher, "sha256Hex">;
  random: Pick<RandomGenerator, "urlToken">;
  clock: Clock;
}

export async function createAuthorizationCode(
  deps: CreateAuthorizationCodeDeps,
  input: {
    clientId: string;
    userId: string;
    redirectUri: string;
    scopes: McpScope[];
    codeChallenge: string;
  },
): Promise<Result<{ code: string }, DomainError>> {
  const client = await deps.clients.findByClientId(input.clientId);
  if (!client) return err(new McpInvalidClient());
  if (!client.redirectUris.includes(input.redirectUri)) {
    return err(new McpInvalidGrant("redirect_uri não registrado para este cliente."));
  }
  const code = deps.random.urlToken();
  const codeHash = await deps.hasher.sha256Hex(code);
  await deps.codes.create({
    codeHash,
    clientId: input.clientId,
    userId: input.userId,
    scopes: input.scopes,
    codeChallenge: input.codeChallenge,
    redirectUri: input.redirectUri,
    expiresAt: new Date(deps.clock.now().getTime() + MCP_AUTH_CODE_TTL_MS),
  });
  return ok({ code });
}
