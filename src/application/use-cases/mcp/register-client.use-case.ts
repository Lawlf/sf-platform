import { McpInvalidClient } from "@/domain/errors/mcp-errors";
import type { McpOauthClientRepositoryPort } from "@/domain/ports/repositories/mcp-oauth-client.repository";
import type { RandomGenerator } from "@/domain/ports/services/random-generator.service";
import type { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface RegisterClientDeps {
  clients: Pick<McpOauthClientRepositoryPort, "create">;
  random: Pick<RandomGenerator, "urlToken">;
}

export interface RegisteredClient {
  clientId: string;
  redirectUris: string[];
  clientName: string;
}

export async function registerClient(
  deps: RegisterClientDeps,
  input: { clientName: string; redirectUris: string[] },
): Promise<Result<RegisteredClient, DomainError>> {
  if (input.redirectUris.length === 0) {
    return err(new McpInvalidClient("redirect_uris é obrigatório."));
  }
  const clientId = deps.random.urlToken();
  const clientName = input.clientName || "Cliente MCP";
  await deps.clients.create({
    clientId,
    clientSecretHash: null,
    redirectUris: input.redirectUris,
    name: clientName,
  });
  return ok({ clientId, redirectUris: input.redirectUris, clientName });
}
