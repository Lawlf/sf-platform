import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";

import type { MagicLinkTokenEntity } from "@/domain/entities/magic-link-token.entity";
import type { MagicLinkTokenRepositoryPort } from "@/domain/ports/repositories/magic-link-token.repository";

import { getDb } from "../client";
import { magicLinkTokens } from "../schema/magic-link-tokens.schema";

function toEntity(row: typeof magicLinkTokens.$inferSelect): MagicLinkTokenEntity {
  return {
    tokenHash: row.tokenHash,
    code: row.code,
    email: row.email,
    userId: row.userId,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    attemptCount: row.attemptCount,
    createdAt: row.createdAt,
  };
}

export class MagicLinkTokenRepository implements MagicLinkTokenRepositoryPort {
  async findByTokenHash(tokenHash: string): Promise<MagicLinkTokenEntity | null> {
    const rows = await getDb()
      .select()
      .from(magicLinkTokens)
      .where(eq(magicLinkTokens.tokenHash, tokenHash))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findActiveByEmail(email: string): Promise<MagicLinkTokenEntity | null> {
    const rows = await getDb()
      .select()
      .from(magicLinkTokens)
      .where(
        and(
          eq(magicLinkTokens.email, email.toLowerCase()),
          isNull(magicLinkTokens.usedAt),
          gt(magicLinkTokens.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(magicLinkTokens.createdAt))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async create(input: {
    tokenHash: string;
    code: string;
    email: string;
    userId: string | null;
    expiresAt: Date;
  }): Promise<MagicLinkTokenEntity> {
    const rows = await getDb()
      .insert(magicLinkTokens)
      .values({
        tokenHash: input.tokenHash,
        code: input.code,
        email: input.email.toLowerCase(),
        userId: input.userId,
        expiresAt: input.expiresAt,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert magic link token: no row returned");
    return toEntity(row);
  }

  async markUsed(tokenHash: string): Promise<void> {
    await getDb()
      .update(magicLinkTokens)
      .set({ usedAt: new Date() })
      .where(eq(magicLinkTokens.tokenHash, tokenHash));
  }

  async incrementAttempts(tokenHash: string): Promise<number> {
    const rows = await getDb()
      .update(magicLinkTokens)
      .set({ attemptCount: sql`${magicLinkTokens.attemptCount} + 1` })
      .where(eq(magicLinkTokens.tokenHash, tokenHash))
      .returning({ attemptCount: magicLinkTokens.attemptCount });
    return rows[0]?.attemptCount ?? 0;
  }

  async deleteExpired(now: Date): Promise<number> {
    const rows = await getDb()
      .delete(magicLinkTokens)
      .where(lt(magicLinkTokens.expiresAt, now))
      .returning();
    return rows.length;
  }
}
