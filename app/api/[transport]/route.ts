import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

import { registerMcpTools } from "@/presentation/http/mcp/mcp-tools";
import { resolveMcpContextFromToken } from "@/presentation/http/mcp/require-mcp-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const baseHandler = createMcpHandler(
  (server) => {
    registerMcpTools(server);
  },
  {},
  { basePath: "/api" },
);

async function verifyToken(req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) {
    console.warn(
      `[mcp/auth] ${req.method} ${new URL(req.url).pathname} sem bearer (header Authorization ${req.headers.get("authorization") ? "presente" : "ausente"})`,
    );
    return undefined;
  }
  const ctx = await resolveMcpContextFromToken(bearerToken);
  if (!ctx) {
    console.warn(`[mcp/auth] token nao resolveu (tamanho=${bearerToken.length})`);
    return undefined;
  }
  return {
    token: bearerToken,
    clientId: ctx.connectionId,
    scopes: ctx.scopes,
    extra: { mcp: ctx },
  };
}

const handler = withMcpAuth(baseHandler, verifyToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST };
