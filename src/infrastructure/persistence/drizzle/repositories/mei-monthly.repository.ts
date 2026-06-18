import { and, desc, eq, sql } from "drizzle-orm";

import type { MeiMonthlyEntity } from "@/domain/entities/mei-monthly.entity";
import type { MeiMonthlyRepositoryPort } from "@/domain/ports/repositories/mei-monthly.repository";

import { getDb } from "../client";
import { meiMonthly, type MeiMonthlyRow } from "../schema/mei-monthly.schema";

function rowToEntity(row: MeiMonthlyRow): MeiMonthlyEntity {
  return {
    id: row.id,
    profileId: row.profileId,
    competencia: row.competencia,
    proLaboreCents: row.proLaboreCents,
    gastoPessoalPjCents: row.gastoPessoalPjCents,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function entityToRow(entity: MeiMonthlyEntity): typeof meiMonthly.$inferInsert {
  return {
    id: entity.id,
    profileId: entity.profileId,
    competencia: entity.competencia,
    proLaboreCents: entity.proLaboreCents,
    gastoPessoalPjCents: entity.gastoPessoalPjCents,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export class MeiMonthlyRepository implements MeiMonthlyRepositoryPort {
  async upsert(entity: MeiMonthlyEntity): Promise<MeiMonthlyEntity> {
    const rows = await getDb()
      .insert(meiMonthly)
      .values(entityToRow(entity))
      .onConflictDoUpdate({
        target: [meiMonthly.profileId, meiMonthly.competencia],
        set: {
          proLaboreCents: entity.proLaboreCents,
          gastoPessoalPjCents: entity.gastoPessoalPjCents,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert mei_monthly");
    return rowToEntity(row);
  }

  async findByProfileCompetencia(
    profileId: string,
    competencia: Date,
  ): Promise<MeiMonthlyEntity | null> {
    const rows = await getDb()
      .select()
      .from(meiMonthly)
      .where(and(eq(meiMonthly.profileId, profileId), eq(meiMonthly.competencia, competencia)))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listForProfile(profileId: string): Promise<MeiMonthlyEntity[]> {
    const rows = await getDb()
      .select()
      .from(meiMonthly)
      .where(eq(meiMonthly.profileId, profileId))
      .orderBy(desc(meiMonthly.competencia));
    return rows.map(rowToEntity);
  }
}
