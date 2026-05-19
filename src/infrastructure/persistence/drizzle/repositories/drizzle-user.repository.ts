import { eq, sql } from "drizzle-orm";

import type { UserEntity } from "@/domain/entities/user.entity";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";

import { getDb } from "../client";
import { users } from "../schema/users.schema";

function toEntity(row: typeof users.$inferSelect): UserEntity {
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt,
    displayName: row.displayName,
    role: row.role,
    plan: row.plan,
    deactivatedAt: row.deactivatedAt,
    deactivationReason: row.deactivationReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleUserRepository implements UserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalized = email.toLowerCase();
    const rows = await getDb()
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalized}`)
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async create(input: {
    email: string;
    emailVerified: boolean;
    displayName?: string | null;
  }): Promise<UserEntity> {
    const rows = await getDb()
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        emailVerifiedAt: input.emailVerified ? new Date() : null,
        displayName: input.displayName ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert user: no row returned");
    return toEntity(row);
  }

  async markEmailVerified(id: string): Promise<void> {
    await getDb().update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, id));
  }

  async deactivate(id: string, reason: string | null): Promise<void> {
    await getDb()
      .update(users)
      .set({ deactivatedAt: new Date(), deactivationReason: reason })
      .where(eq(users.id, id));
  }
}
