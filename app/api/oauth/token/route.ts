import { NextResponse, type NextRequest } from "next/server";


import { exchangeAuthorizationCode } from "@/application/use-cases/mcp/exchange-authorization-code.use-case";
import { refreshAccessToken } from "@/application/use-cases/mcp/refresh-access-token.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { clock, repos } from "@/infrastructure/container";
import { issueOpaqueToken } from "@/infrastructure/mcp/mcp-token-factory";
import { verifyPkceS256 } from "@/infrastructure/mcp/pkce";
import { isErr } from "@/shared/errors/result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const grantType = String(form.get("grant_type") ?? "");

  if (grantType === "authorization_code") {
    const result = await exchangeAuthorizationCode(
      {
        codes: repos.mcpAuthorizationCodes,
        clients: repos.mcpOauthClients,
        connections: repos.mcpConnections,
        tokens: repos.mcpTokens,
        hasher: new WebCryptoHasher(),
        issueToken: issueOpaqueToken,
        verifyPkce: verifyPkceS256,
        clock,
      },
      {
        code: String(form.get("code") ?? ""),
        clientId: String(form.get("client_id") ?? ""),
        redirectUri: String(form.get("redirect_uri") ?? ""),
        codeVerifier: String(form.get("code_verifier") ?? ""),
      },
    );
    if (isErr(result)) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    return NextResponse.json({
      access_token: result.value.accessToken,
      refresh_token: result.value.refreshToken,
      token_type: "Bearer",
      expires_in: result.value.expiresInSec,
      scope: result.value.scopes.join(" "),
    });
  }

  if (grantType === "refresh_token") {
    const result = await refreshAccessToken(
      {
        tokens: repos.mcpTokens,
        connections: repos.mcpConnections,
        hasher: new WebCryptoHasher(),
        issueToken: issueOpaqueToken,
        clock,
      },
      { refreshToken: String(form.get("refresh_token") ?? "") },
    );
    if (isErr(result)) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    return NextResponse.json({
      access_token: result.value.accessToken,
      refresh_token: result.value.refreshToken,
      token_type: "Bearer",
      expires_in: result.value.expiresInSec,
    });
  }

  return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
}
