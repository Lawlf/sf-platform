import { eq } from "drizzle-orm";

import type {
  McpOauthClient,
  McpOauthClientRepository,
} from "@/domain/ports/repositories/mcp-oauth-client.repository";

import { getDb } from "../client";
import { mcpOauthClients } from "../schema/mcp-oauth-clients.schema";

function toEntity(row: typeof mcpOauthClients.$inferSelect): McpOauthClient {
  return {
    id: row.id,
    clientId: row.clientId,
    clientSecretHash: row.clientSecretHash,
    redirectUris: row.redirectUris,
    name: row.name,
    createdAt: row.createdAt,
  };
}

export class DrizzleMcpOauthClientRepository implements McpOauthClientRepository {
  async create(input: {
    clientId: string;
    clientSecretHash: string | null;
    redirectUris: string[];
    name: string;
  }): Promise<McpOauthClient> {
    const rows = await getDb()
      .insert(mcpOauthClients)
      .values({
        clientId: input.clientId,
        clientSecretHash: input.clientSecretHash,
        redirectUris: input.redirectUris,
        name: input.name,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert mcp oauth client");
    return toEntity(row);
  }

  async findByClientId(clientId: string): Promise<McpOauthClient | null> {
    const rows = await getDb()
      .select()
      .from(mcpOauthClients)
      .where(eq(mcpOauthClients.clientId, clientId))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }
}
