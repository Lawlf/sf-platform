import { and, asc, eq } from "drizzle-orm";

import type {
  IncomeSettlementEntity,
  IncomeSettlementStatus,
} from "@/domain/entities/income-settlement.entity";
import type { IncomeSettlementRepositoryPort } from "@/domain/ports/repositories/income-settlement.repository";

import { getDb } from "../client";
import {
  incomeSettlements,
  type IncomeSettlementRow,
} from "../schema/income-settlements.schema";

function rowToEntity(row: IncomeSettlementRow): IncomeSettlementEntity {
  return {
    userId: row.userId,
    profileId: row.profileId,
    incomeId: row.incomeId,
    month: row.month,
    status: row.status as IncomeSettlementStatus,
    adjustedAmountCents: row.adjustedAmountCents,
    createdAt: row.createdAt,
  };
}

export class IncomeSettlementRepository implements IncomeSettlementRepositoryPort {
  async upsert(settlement: IncomeSettlementEntity): Promise<void> {
    await getDb()
      .insert(incomeSettlements)
      .values({
        userId: settlement.userId,
        profileId: settlement.profileId,
        incomeId: settlement.incomeId,
        month: settlement.month,
        status: settlement.status,
        adjustedAmountCents: settlement.adjustedAmountCents,
        createdAt: settlement.createdAt,
      })
      .onConflictDoUpdate({
        target: [
          incomeSettlements.profileId,
          incomeSettlements.incomeId,
          incomeSettlements.month,
        ],
        set: {
          profileId: settlement.profileId,
          status: settlement.status,
          adjustedAmountCents: settlement.adjustedAmountCents,
          createdAt: settlement.createdAt,
        },
      });
  }

  async listForProfileMonth(profileId: string, month: Date): Promise<IncomeSettlementEntity[]> {
    const rows = await getDb()
      .select()
      .from(incomeSettlements)
      .where(and(eq(incomeSettlements.profileId, profileId), eq(incomeSettlements.month, month)))
      .orderBy(asc(incomeSettlements.incomeId));
    return rows.map(rowToEntity);
  }

  async listForProfile(profileId: string): Promise<IncomeSettlementEntity[]> {
    const rows = await getDb()
      .select()
      .from(incomeSettlements)
      .where(eq(incomeSettlements.profileId, profileId))
      .orderBy(asc(incomeSettlements.month));
    return rows.map(rowToEntity);
  }
}
