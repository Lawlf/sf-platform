import { and, desc, eq, gt } from "drizzle-orm";

import type { SessionEntity } from "@/domain/entities/session.entity";
import type { SessionRepository } from "@/domain/ports/repositories/session.repository";

import { getDb } from "../client";
import { sessions } from "../schema/sessions.schema";

function toEntity(row: typeof sessions.$inferSelect): SessionEntity {
  return {
    idHash: row.idHash,
    userId: row.userId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    ip: row.ip,
    userAgent: row.userAgent,
  };
}

export class DrizzleSessionRepository implements SessionRepository {
  async findByIdHash(idHash: string): Promise<SessionEntity | null> {
    const rows = await getDb().select().from(sessions).where(eq(sessions.idHash, idHash)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async listActiveForUser(userId: string): Promise<SessionEntity[]> {
    const rows = await getDb()
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.lastUsedAt));
    return rows.map(toEntity);
  }

  async create(input: {
    idHash: string;
    userId: string;
    expiresAt: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<SessionEntity> {
    const rows = await getDb()
      .insert(sessions)
      .values({
        idHash: input.idHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
        ip: input.ip,
        userAgent: input.userAgent,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert session: no row returned");
    return toEntity(row);
  }

  async touch(idHash: string, newExpiresAt: Date, now: Date): Promise<void> {
    await getDb()
      .update(sessions)
      .set({ expiresAt: newExpiresAt, lastUsedAt: now })
      .where(eq(sessions.idHash, idHash));
  }

  async delete(idHash: string): Promise<void> {
    await getDb().delete(sessions).where(eq(sessions.idHash, idHash));
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await getDb().delete(sessions).where(eq(sessions.userId, userId));
  }
}
