import { NextResponse } from "next/server";

import { MCP_SHIPPED_SCOPES } from "@/domain/mcp/scopes";
import { loadEnv } from "@/infrastructure/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = loadEnv().NEXT_PUBLIC_APP_URL;
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/app/configuracoes/integracoes/autorizar`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    scopes_supported: MCP_SHIPPED_SCOPES,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}
