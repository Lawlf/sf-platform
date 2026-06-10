import { McpInvalidGrant } from "@/domain/errors/mcp-errors";
import { MCP_ACCESS_TOKEN_TTL_MS, MCP_REFRESH_TOKEN_TTL_MS } from "@/domain/mcp/constants";
import type { McpScope } from "@/domain/mcp/scopes";
import type { Clock } from "@/domain/ports/clock.port";
import type { McpAuthorizationCodeRepositoryPort } from "@/domain/ports/repositories/mcp-authorization-code.repository";
import type { McpConnectionRepositoryPort } from "@/domain/ports/repositories/mcp-connection.repository";
import type { McpOauthClientRepositoryPort } from "@/domain/ports/repositories/mcp-oauth-client.repository";
import type { McpTokenRepositoryPort } from "@/domain/ports/repositories/mcp-token.repository";
import type { Hasher } from "@/domain/ports/services/hasher.service";
import type { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface ExchangeAuthorizationCodeDeps {
  codes: Pick<McpAuthorizationCodeRepositoryPort, "findByHash" | "markConsumed">;
  clients: Pick<McpOauthClientRepositoryPort, "findByClientId">;
  connections: Pick<McpConnectionRepositoryPort, "create">;
  tokens: Pick<McpTokenRepositoryPort, "createAccessToken" | "createRefreshToken">;
  hasher: Pick<Hasher, "sha256Hex">;
  issueToken: () => Promise<{ raw: string; hash: string }>;
  verifyPkce: (verifier: string, challenge: string) => boolean;
  clock: Clock;
}

export interface ExchangedTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
  scopes: McpScope[];
}

export async function exchangeAuthorizationCode(
  deps: ExchangeAuthorizationCodeDeps,
  input: { code: string; clientId: string; redirectUri: string; codeVerifier: string },
): Promise<Result<ExchangedTokens, DomainError>> {
  const now = deps.clock.now();
  const codeHash = await deps.hasher.sha256Hex(input.code);
  const record = await deps.codes.findByHash(codeHash);
  if (!record) return err(new McpInvalidGrant());
  if (record.consumedAt) return err(new McpInvalidGrant());
  if (record.expiresAt <= now) return err(new McpInvalidGrant());
  if (record.clientId !== input.clientId) return err(new McpInvalidGrant());
  if (record.redirectUri !== input.redirectUri) return err(new McpInvalidGrant());
  if (!deps.verifyPkce(input.codeVerifier, record.codeChallenge)) return err(new McpInvalidGrant());

  const client = await deps.clients.findByClientId(record.clientId);
  const clientName = client?.name ?? "Cliente MCP";

  const consumed = await deps.codes.markConsumed(codeHash, now);
  if (!consumed) return err(new McpInvalidGrant());

  const connection = await deps.connections.create({
    userId: record.userId,
    clientId: record.clientId,
    clientName,
    scopes: record.scopes,
  });

  const access = await deps.issueToken();
  const refresh = await deps.issueToken();
  await deps.tokens.createAccessToken({
    tokenHash: access.hash,
    connectionId: connection.id,
    expiresAt: new Date(now.getTime() + MCP_ACCESS_TOKEN_TTL_MS),
  });
  await deps.tokens.createRefreshToken({
    tokenHash: refresh.hash,
    connectionId: connection.id,
    expiresAt: new Date(now.getTime() + MCP_REFRESH_TOKEN_TTL_MS),
  });

  return ok({
    accessToken: access.raw,
    refreshToken: refresh.raw,
    expiresInSec: Math.floor(MCP_ACCESS_TOKEN_TTL_MS / 1000),
    scopes: record.scopes,
  });
}
