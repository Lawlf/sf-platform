import { and, count, desc, eq, isNull, sql } from "drizzle-orm";


import type { GoalEntity, GoalStatus } from "@/domain/entities/goal.entity";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";

import { getDb } from "../client";
import { scopedToProfile } from "../helpers";
import { goals, type GoalRow, type NewGoalRow } from "../schema/goals.schema";

function rowToEntity(row: GoalRow): GoalEntity {
  return {
    id: row.id,
    userId: row.userId,
    profileId: row.profileId,
    householdId: row.householdId ?? null,
    type: row.type,
    title: row.title,
    status: row.status,
    targetCents: row.targetCents ?? null,
    deadline: row.deadline ?? null,
    linkedDebtId: row.linkedDebtId ?? null,
    linkedAssetId: row.linkedAssetId ?? null,
    targetMonths: row.targetMonths ?? null,
    fundingMode: row.fundingMode ?? null,
    manualSavedCents: row.manualSavedCents ?? null,
    monthlyCostCents: row.monthlyCostCents ?? null,
    realReturnPct: row.realReturnPct === null ? null : Number(row.realReturnPct),
    cascadeOrder: row.cascadeOrder ?? null,
    cascadeMode: row.cascadeMode ?? null,
    cascadeParallelPct: row.cascadeParallelPct === null ? null : Number(row.cascadeParallelPct),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function entityToRow(entity: Omit<GoalEntity, "createdAt" | "updatedAt">): NewGoalRow {
  return {
    id: entity.id,
    userId: entity.userId,
    profileId: entity.profileId,
    householdId: entity.householdId ?? null,
    type: entity.type,
    title: entity.title,
    status: entity.status,
    targetCents: entity.targetCents ?? null,
    deadline: entity.deadline ?? null,
    linkedDebtId: entity.linkedDebtId ?? null,
    linkedAssetId: entity.linkedAssetId ?? null,
    targetMonths: entity.targetMonths ?? null,
    fundingMode: entity.fundingMode ?? null,
    manualSavedCents: entity.manualSavedCents ?? null,
    monthlyCostCents: entity.monthlyCostCents ?? null,
    realReturnPct:
      entity.realReturnPct === null || entity.realReturnPct === undefined
        ? null
        : String(entity.realReturnPct),
    cascadeOrder: entity.cascadeOrder ?? null,
    cascadeMode: entity.cascadeMode ?? null,
    cascadeParallelPct:
      entity.cascadeParallelPct === null || entity.cascadeParallelPct === undefined
        ? null
        : String(entity.cascadeParallelPct),
  };
}

export class GoalRepository implements GoalRepositoryPort {
  async create(goal: Omit<GoalEntity, "createdAt" | "updatedAt">): Promise<GoalEntity> {
    const rows = await getDb().insert(goals).values(entityToRow(goal)).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert goal: no row returned");
    return rowToEntity(row);
  }

  async update(id: string, patch: Partial<GoalEntity>): Promise<GoalEntity | null> {
    const setPatch: Partial<NewGoalRow> = {};

    if (patch.type !== undefined) setPatch.type = patch.type;
    if (patch.title !== undefined) setPatch.title = patch.title;
    if (patch.status !== undefined) setPatch.status = patch.status;
    if ("targetCents" in patch) setPatch.targetCents = patch.targetCents ?? null;
    if ("deadline" in patch) setPatch.deadline = patch.deadline ?? null;
    if ("linkedDebtId" in patch) setPatch.linkedDebtId = patch.linkedDebtId ?? null;
    if ("linkedAssetId" in patch) setPatch.linkedAssetId = patch.linkedAssetId ?? null;
    if ("targetMonths" in patch) setPatch.targetMonths = patch.targetMonths ?? null;
    if ("fundingMode" in patch) setPatch.fundingMode = patch.fundingMode ?? null;
    if ("manualSavedCents" in patch) setPatch.manualSavedCents = patch.manualSavedCents ?? null;
    if ("monthlyCostCents" in patch) setPatch.monthlyCostCents = patch.monthlyCostCents ?? null;
    if ("realReturnPct" in patch) {
      setPatch.realReturnPct =
        patch.realReturnPct === null || patch.realReturnPct === undefined
          ? null
          : String(patch.realReturnPct);
    }
    if ("cascadeOrder" in patch) setPatch.cascadeOrder = patch.cascadeOrder ?? null;
    if ("cascadeMode" in patch) setPatch.cascadeMode = patch.cascadeMode ?? null;
    if ("cascadeParallelPct" in patch) {
      setPatch.cascadeParallelPct =
        patch.cascadeParallelPct === null || patch.cascadeParallelPct === undefined
          ? null
          : String(patch.cascadeParallelPct);
    }

    const rows = await getDb()
      .update(goals)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ ...setPatch, updatedAt: sql`now()` } as any)
      .where(eq(goals.id, id))
      .returning();
    const row = rows[0];
    if (!row) return null;
    return rowToEntity(row);
  }

  async findById(id: string): Promise<GoalEntity | null> {
    const rows = await getDb()
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), isNull(goals.deletedAt)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return rowToEntity(row);
  }

  async listForProfile(profileId: string, opts?: { status?: GoalStatus }): Promise<GoalEntity[]> {
    const conditions = [scopedToProfile(goals, profileId), isNull(goals.householdId)];
    if (opts?.status !== undefined) {
      conditions.push(eq(goals.status, opts.status));
    }
    const rows = await getDb()
      .select()
      .from(goals)
      .where(and(...conditions))
      .orderBy(desc(goals.createdAt));
    return rows.map(rowToEntity);
  }

  async listForHousehold(householdId: string): Promise<GoalEntity[]> {
    const rows = await getDb()
      .select()
      .from(goals)
      .where(and(eq(goals.householdId, householdId), eq(goals.status, "active"), isNull(goals.deletedAt)))
      .orderBy(desc(goals.createdAt));
    return rows.map(rowToEntity);
  }

  async findByIdInHousehold(goalId: string, householdId: string): Promise<GoalEntity | null> {
    const rows = await getDb()
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.householdId, householdId), isNull(goals.deletedAt)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return rowToEntity(row);
  }

  async countActive(profileId: string): Promise<number> {
    const result = await getDb()
      .select({ value: count() })
      .from(goals)
      .where(
        and(
          eq(goals.profileId, profileId),
          eq(goals.status, "active"),
          isNull(goals.deletedAt),
          isNull(goals.householdId),
        ),
      );
    return result[0]?.value ?? 0;
  }

  async softDelete(id: string): Promise<void> {
    await getDb()
      .update(goals)
      .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(goals.id, id));
  }

  async restore(id: string): Promise<void> {
    await getDb()
      .update(goals)
      .set({ deletedAt: null, updatedAt: sql`now()` })
      .where(eq(goals.id, id));
  }

  async listAllActive(): Promise<GoalEntity[]> {
    const rows = await getDb()
      .select()
      .from(goals)
      .where(and(eq(goals.status, "active"), isNull(goals.deletedAt)));
    return rows.map(rowToEntity);
  }
}
