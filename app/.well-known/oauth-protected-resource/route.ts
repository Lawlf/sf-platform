import { NextResponse } from "next/server";

import { MCP_SHIPPED_SCOPES } from "@/domain/mcp/scopes";
import { loadEnv } from "@/infrastructure/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = loadEnv().NEXT_PUBLIC_APP_URL;
  return NextResponse.json({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    scopes_supported: MCP_SHIPPED_SCOPES,
    bearer_methods_supported: ["header"],
  });
}
