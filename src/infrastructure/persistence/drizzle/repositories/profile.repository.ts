import { and, asc, eq } from "drizzle-orm";

import type { ProfileEntity } from "@/domain/entities/profile.entity";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";

import { getDb } from "../client";
import { profiles, type ProfileRow } from "../schema/profiles.schema";

function rowToEntity(row: ProfileRow): ProfileEntity {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    linkedProfileId: row.linkedProfileId ?? null,
    displayName: row.displayName ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ProfileRepository implements ProfileRepositoryPort {
  async listForUser(userId: string): Promise<ProfileEntity[]> {
    const rows = await getDb()
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .orderBy(asc(profiles.createdAt));
    return rows.map(rowToEntity);
  }

  async findById(id: string): Promise<ProfileEntity | null> {
    const rows = await getDb().select().from(profiles).where(eq(profiles.id, id)).limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async ensurePfProfile(userId: string, now: Date): Promise<ProfileEntity> {
    await getDb()
      .insert(profiles)
      .values({ userId, type: "PF", createdAt: now, updatedAt: now })
      .onConflictDoNothing({ target: [profiles.userId, profiles.type] });
    const rows = await getDb()
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), eq(profiles.type, "PF")))
      .limit(1);
    const row = rows[0];
    if (!row) throw new Error("ensurePfProfile: PF não encontrado após upsert");
    return rowToEntity(row);
  }

  async create(input: {
    userId: string;
    type: ProfileEntity["type"];
    linkedProfileId: string | null;
    displayName: string | null;
    now: Date;
  }): Promise<ProfileEntity> {
    const rows = await getDb()
      .insert(profiles)
      .values({
        userId: input.userId,
        type: input.type,
        linkedProfileId: input.linkedProfileId,
        displayName: input.displayName,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert profile");
    return rowToEntity(row);
  }
}
