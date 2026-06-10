import { and, eq, isNull } from "drizzle-orm";

import type { McpScope } from "@/domain/mcp/scopes";
import type {
  McpAuthorizationCode,
  McpAuthorizationCodeRepositoryPort,
} from "@/domain/ports/repositories/mcp-authorization-code.repository";

import { getDb } from "../client";
import { mcpAuthorizationCodes } from "../schema/mcp-authorization-codes.schema";

export class McpAuthorizationCodeRepository implements McpAuthorizationCodeRepositoryPort {
  async create(input: Omit<McpAuthorizationCode, "consumedAt">): Promise<void> {
    await getDb().insert(mcpAuthorizationCodes).values({
      codeHash: input.codeHash,
      clientId: input.clientId,
      userId: input.userId,
      scopes: input.scopes,
      codeChallenge: input.codeChallenge,
      redirectUri: input.redirectUri,
      expiresAt: input.expiresAt,
    });
  }

  async findByHash(codeHash: string): Promise<McpAuthorizationCode | null> {
    const rows = await getDb()
      .select()
      .from(mcpAuthorizationCodes)
      .where(eq(mcpAuthorizationCodes.codeHash, codeHash))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      codeHash: row.codeHash,
      clientId: row.clientId,
      userId: row.userId,
      scopes: row.scopes as McpScope[],
      codeChallenge: row.codeChallenge,
      redirectUri: row.redirectUri,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt,
    };
  }

  async markConsumed(codeHash: string, now: Date): Promise<boolean> {
    const rows = await getDb()
      .update(mcpAuthorizationCodes)
      .set({ consumedAt: now })
      .where(
        and(eq(mcpAuthorizationCodes.codeHash, codeHash), isNull(mcpAuthorizationCodes.consumedAt)),
      )
      .returning();
    return rows.length > 0;
  }
}
