"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { createAuthorizationCode } from "@/application/use-cases/mcp/create-authorization-code.use-case";
import { MCP_SHIPPED_SCOPES, type McpScope, parseScopeString } from "@/domain/mcp/scopes";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleMcpAuthorizationCodeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-authorization-code.repository";
import { DrizzleMcpOauthClientRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-oauth-client.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

export async function approveAuthorization(formData: FormData): Promise<void> {
  const user = await requireUser();
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const grantedScopes = formData.getAll("scope").map(String).filter(Boolean);
  const shipped = new Set<McpScope>(MCP_SHIPPED_SCOPES);
  const scopes = parseScopeString(grantedScopes.join(" ")).filter((scope) => shipped.has(scope));

  const clients = new DrizzleMcpOauthClientRepository();
  const client = await clients.findByClientId(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    redirect("/app/configuracoes/integracoes" as Route);
  }

  const result = await createAuthorizationCode(
    {
      clients,
      codes: new DrizzleMcpAuthorizationCodeRepository(),
      hasher: new WebCryptoHasher(),
      random: new WebCryptoRandomGenerator(),
      clock: new SystemClock(),
    },
    { clientId, userId: user.id, redirectUri, scopes, codeChallenge },
  );

  const url = new URL(redirectUri);
  if (isErr(result)) {
    url.searchParams.set("error", "access_denied");
  } else {
    url.searchParams.set("code", result.value.code);
  }
  if (state) url.searchParams.set("state", state);
  redirect(url.toString() as Route);
}
