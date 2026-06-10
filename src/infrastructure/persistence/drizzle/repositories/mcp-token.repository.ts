import { eq } from "drizzle-orm";

import type {
  McpAccessToken,
  McpRefreshToken,
  McpTokenRepositoryPort,
} from "@/domain/ports/repositories/mcp-token.repository";

import { getDb } from "../client";
import { mcpAccessTokens } from "../schema/mcp-access-tokens.schema";
import { mcpRefreshTokens } from "../schema/mcp-refresh-tokens.schema";

export class McpTokenRepository implements McpTokenRepositoryPort {
  async createAccessToken(input: McpAccessToken): Promise<void> {
    await getDb().insert(mcpAccessTokens).values(input);
  }

  async findAccessTokenByHash(tokenHash: string): Promise<McpAccessToken | null> {
    const rows = await getDb()
      .select()
      .from(mcpAccessTokens)
      .where(eq(mcpAccessTokens.tokenHash, tokenHash))
      .limit(1);
    const row = rows[0];
    return row
      ? { tokenHash: row.tokenHash, connectionId: row.connectionId, expiresAt: row.expiresAt }
      : null;
  }

  async createRefreshToken(input: McpRefreshToken): Promise<void> {
    await getDb().insert(mcpRefreshTokens).values(input);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<McpRefreshToken | null> {
    const rows = await getDb()
      .select()
      .from(mcpRefreshTokens)
      .where(eq(mcpRefreshTokens.tokenHash, tokenHash))
      .limit(1);
    const row = rows[0];
    return row
      ? { tokenHash: row.tokenHash, connectionId: row.connectionId, expiresAt: row.expiresAt }
      : null;
  }

  async rotateRefreshToken(oldHash: string, next: McpRefreshToken): Promise<void> {
    await getDb().delete(mcpRefreshTokens).where(eq(mcpRefreshTokens.tokenHash, oldHash));
    await getDb().insert(mcpRefreshTokens).values({ ...next, rotatedFromHash: oldHash });
  }

  async deleteForConnection(connectionId: string): Promise<void> {
    await getDb().delete(mcpAccessTokens).where(eq(mcpAccessTokens.connectionId, connectionId));
    await getDb().delete(mcpRefreshTokens).where(eq(mcpRefreshTokens.connectionId, connectionId));
  }
}
