import { and, desc, eq, gt, lt } from "drizzle-orm";

import type { SessionEntity } from "@/domain/entities/session.entity";
import type { AcquisitionChannel, UserEntity } from "@/domain/entities/user.entity";
import type {
  SessionRepositoryPort,
  SessionWithUser,
} from "@/domain/ports/repositories/session.repository";
import type { Currency } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import { sessions } from "../schema/sessions.schema";
import { users } from "../schema/users.schema";

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

function userRowToEntity(row: typeof users.$inferSelect): UserEntity {
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt,
    displayName: row.displayName,
    role: row.role,
    plan: row.plan,
    isPro: row.isPro,
    deactivatedAt: row.deactivatedAt,
    deactivationReason: row.deactivationReason,
    contentDiagnosticAnswer: row.contentDiagnosticAnswer,
    contentDiagnosticAnsweredAt: row.contentDiagnosticAnsweredAt,
    onboardingWizardSeenAt: row.onboardingWizardSeenAt,
    homeTourDismissedAt: row.homeTourDismissedAt,
    acquisitionChannel: (row.acquisitionChannel as AcquisitionChannel | null) ?? null,
    acquisitionChannelOther: row.acquisitionChannelOther,
    quickAccess: (row.quickAccess as string[] | null) ?? [],
    username: row.username,
    profileFlair: row.profileFlair,
    baseCurrency: (row.baseCurrency as Currency | null) ?? "BRL",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class SessionRepository implements SessionRepositoryPort {
  async findByIdHash(idHash: string): Promise<SessionEntity | null> {
    const rows = await getDb().select().from(sessions).where(eq(sessions.idHash, idHash)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findWithUserByIdHash(idHash: string): Promise<SessionWithUser | null> {
    const rows = await getDb()
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.idHash, idHash))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { session: toEntity(row.session), user: userRowToEntity(row.user) };
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

  async deleteExpired(now: Date): Promise<number> {
    const rows = await getDb().delete(sessions).where(lt(sessions.expiresAt, now)).returning();
    return rows.length;
  }
}
