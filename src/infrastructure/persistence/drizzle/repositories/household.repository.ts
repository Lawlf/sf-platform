import { and, asc, eq } from "drizzle-orm";

import type {
  HouseholdEntity,
  HouseholdInviteEntity,
  HouseholdInviteStatus,
  HouseholdMemberEntity,
  HouseholdRole,
} from "@/domain/entities/household.entity";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";

import { getDb } from "../client";
import {
  householdInvites,
  householdMembers,
  households,
  type HouseholdInviteRow,
  type HouseholdMemberRow,
  type HouseholdRow,
} from "../schema/households.schema";

function rowToHousehold(row: HouseholdRow): HouseholdEntity {
  return {
    id: row.id,
    name: row.name,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToMember(row: HouseholdMemberRow): HouseholdMemberEntity {
  return {
    householdId: row.householdId,
    userId: row.userId,
    role: row.role as HouseholdRole,
    joinedAt: row.joinedAt,
  };
}

function rowToInvite(row: HouseholdInviteRow): HouseholdInviteEntity {
  return {
    id: row.id,
    householdId: row.householdId,
    invitedByUserId: row.invitedByUserId,
    inviteeRef: row.inviteeRef,
    status: row.status as HouseholdInviteStatus,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt ?? null,
  };
}

export class HouseholdRepository implements HouseholdRepositoryPort {
  async createHousehold(input: {
    id: string;
    name: string;
    createdByUserId: string;
    now: Date;
  }): Promise<HouseholdEntity> {
    const rows = await getDb()
      .insert(households)
      .values({
        id: input.id,
        name: input.name,
        createdByUserId: input.createdByUserId,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert household");
    return rowToHousehold(row);
  }

  async addMember(input: {
    householdId: string;
    userId: string;
    role: HouseholdRole;
    now: Date;
  }): Promise<void> {
    await getDb().insert(householdMembers).values({
      householdId: input.householdId,
      userId: input.userId,
      role: input.role,
      joinedAt: input.now,
    });
  }

  async removeMember(householdId: string, userId: string): Promise<void> {
    await getDb()
      .delete(householdMembers)
      .where(
        and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)),
      );
  }

  async setRole(householdId: string, userId: string, role: HouseholdRole): Promise<void> {
    await getDb()
      .update(householdMembers)
      .set({ role })
      .where(
        and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)),
      );
  }

  async listMembers(householdId: string): Promise<HouseholdMemberEntity[]> {
    const rows = await getDb()
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.householdId, householdId))
      .orderBy(asc(householdMembers.joinedAt));
    return rows.map(rowToMember);
  }

  async findMembership(householdId: string, userId: string): Promise<HouseholdMemberEntity | null> {
    const rows = await getDb()
      .select()
      .from(householdMembers)
      .where(
        and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)),
      )
      .limit(1);
    return rows[0] ? rowToMember(rows[0]) : null;
  }

  async listHouseholdsForUser(userId: string): Promise<HouseholdEntity[]> {
    const rows = await getDb()
      .select({ household: households })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(eq(householdMembers.userId, userId))
      .orderBy(asc(households.createdAt));
    return rows.map((r) => rowToHousehold(r.household));
  }

  async findHousehold(id: string): Promise<HouseholdEntity | null> {
    const rows = await getDb()
      .select()
      .from(households)
      .where(eq(households.id, id))
      .limit(1);
    return rows[0] ? rowToHousehold(rows[0]) : null;
  }

  async deleteHousehold(id: string): Promise<void> {
    await getDb().delete(households).where(eq(households.id, id));
  }

  async createInvite(input: {
    id: string;
    householdId: string;
    invitedByUserId: string;
    inviteeRef: string;
    now: Date;
  }): Promise<HouseholdInviteEntity> {
    const rows = await getDb()
      .insert(householdInvites)
      .values({
        id: input.id,
        householdId: input.householdId,
        invitedByUserId: input.invitedByUserId,
        inviteeRef: input.inviteeRef,
        status: "pending",
        createdAt: input.now,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert household invite");
    return rowToInvite(row);
  }

  async findInvite(id: string): Promise<HouseholdInviteEntity | null> {
    const rows = await getDb()
      .select()
      .from(householdInvites)
      .where(eq(householdInvites.id, id))
      .limit(1);
    return rows[0] ? rowToInvite(rows[0]) : null;
  }

  async listPendingInvitesForRef(inviteeRef: string): Promise<HouseholdInviteEntity[]> {
    const rows = await getDb()
      .select()
      .from(householdInvites)
      .where(
        and(eq(householdInvites.inviteeRef, inviteeRef), eq(householdInvites.status, "pending")),
      )
      .orderBy(asc(householdInvites.createdAt));
    return rows.map(rowToInvite);
  }

  async setInviteStatus(id: string, status: HouseholdInviteStatus, now: Date): Promise<void> {
    await getDb()
      .update(householdInvites)
      .set({ status, respondedAt: now })
      .where(eq(householdInvites.id, id));
  }
}
