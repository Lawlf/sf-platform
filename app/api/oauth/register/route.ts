import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { registerClient } from "@/application/use-cases/mcp/register-client.use-case";
import { WebCryptoRandomGenerator } from "@/infrastructure/auth/web-crypto-random-generator";
import { DrizzleMcpOauthClientRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-mcp-oauth-client.repository";
import { isErr } from "@/shared/errors/result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  client_name: z.string().optional(),
  redirect_uris: z.array(z.url()).min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }
  const result = await registerClient(
    { clients: new DrizzleMcpOauthClientRepository(), random: new WebCryptoRandomGenerator() },
    {
      clientName: parsed.data.client_name ?? "Cliente MCP",
      redirectUris: parsed.data.redirect_uris,
    },
  );
  if (isErr(result)) {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }
  return NextResponse.json(
    {
      client_id: result.value.clientId,
      redirect_uris: result.value.redirectUris,
      client_name: result.value.clientName,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
    },
    { status: 201 },
  );
}
