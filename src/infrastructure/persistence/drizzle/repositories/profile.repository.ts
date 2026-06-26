import { and, asc, eq, sql } from "drizzle-orm";

import type { ProfileEntity } from "@/domain/entities/profile.entity";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import type { ConservativeLevel } from "@/domain/services/safe-to-spend.service";

import { getDb } from "../client";
import { profiles, type ProfileRow } from "../schema/profiles.schema";

function rowToEntity(row: ProfileRow): ProfileEntity {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    linkedProfileId: row.linkedProfileId ?? null,
    displayName: row.displayName ?? null,
    isPrimary: row.isPrimary,
    checklistDebtDismissedAt: row.checklistDebtDismissedAt,
    checklistGoalDismissedAt: row.checklistGoalDismissedAt,
    taxClassification: row.taxClassification ?? null,
    conservativeLevel: (row.conservativeLevel ?? "normal") as ConservativeLevel,
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

  async findPrimaryPf(userId: string): Promise<ProfileEntity | null> {
    const rows = await getDb()
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), eq(profiles.isPrimary, true)))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async ensurePfProfile(userId: string, now: Date): Promise<ProfileEntity> {
    await getDb()
      .insert(profiles)
      .values({ userId, type: "PF", isPrimary: true, createdAt: now, updatedAt: now })
      .onConflictDoNothing({ target: profiles.userId, where: sql`${profiles.isPrimary}` });
    const rows = await getDb()
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), eq(profiles.isPrimary, true)))
      .limit(1);
    const row = rows[0];
    if (!row) throw new Error("ensurePfProfile: primary PF não encontrado após upsert");
    return rowToEntity(row);
  }

  async findByLinkedProfileId(linkedProfileId: string): Promise<ProfileEntity | null> {
    const rows = await getDb()
      .select()
      .from(profiles)
      .where(eq(profiles.linkedProfileId, linkedProfileId))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async create(input: {
    userId: string;
    type: ProfileEntity["type"];
    linkedProfileId: string | null;
    displayName: string | null;
    isPrimary: boolean;
    taxClassification: ProfileEntity["taxClassification"];
    now: Date;
  }): Promise<ProfileEntity> {
    const rows = await getDb()
      .insert(profiles)
      .values({
        userId: input.userId,
        type: input.type,
        linkedProfileId: input.linkedProfileId,
        displayName: input.displayName,
        isPrimary: input.isPrimary,
        taxClassification: input.taxClassification ?? undefined,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert profile");
    return rowToEntity(row);
  }

  async rename(profileId: string, displayName: string): Promise<void> {
    await getDb()
      .update(profiles)
      .set({ displayName, updatedAt: sql`now()` })
      .where(eq(profiles.id, profileId));
  }

  async delete(profileId: string): Promise<void> {
    await getDb().delete(profiles).where(eq(profiles.id, profileId));
  }

  async setLinkedProfile(profileId: string, linkedProfileId: string | null): Promise<void> {
    await getDb()
      .update(profiles)
      .set({ linkedProfileId, updatedAt: sql`now()` })
      .where(eq(profiles.id, profileId));
  }

  async markChecklistItemDismissed(profileId: string, item: "debt" | "goal"): Promise<void> {
    const column =
      item === "debt"
        ? { checklistDebtDismissedAt: new Date() }
        : { checklistGoalDismissedAt: new Date() };
    await getDb()
      .update(profiles)
      .set({ ...column, updatedAt: sql`now()` })
      .where(eq(profiles.id, profileId));
  }

  async setConservativeLevel(profileId: string, level: ConservativeLevel): Promise<void> {
    await getDb()
      .update(profiles)
      .set({ conservativeLevel: level, updatedAt: sql`now()` })
      .where(eq(profiles.id, profileId));
  }
}
