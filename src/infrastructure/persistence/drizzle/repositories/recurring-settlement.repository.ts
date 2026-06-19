import { and, asc, eq } from "drizzle-orm";

import type {
  RecurringSettlementEntity,
  RecurringSettlementStatus,
} from "@/domain/entities/recurring-settlement.entity";
import type { RecurringSettlementRepositoryPort } from "@/domain/ports/repositories/recurring-settlement.repository";

import { getDb } from "../client";
import {
  recurringSettlements,
  type RecurringSettlementRow,
} from "../schema/recurring-settlements.schema";

function rowToEntity(row: RecurringSettlementRow): RecurringSettlementEntity {
  return {
    userId: row.userId,
    profileId: row.profileId,
    debtId: row.debtId,
    month: row.month,
    status: row.status as RecurringSettlementStatus,
    createdDebtId: row.createdDebtId,
    createdAt: row.createdAt,
  };
}

export class RecurringSettlementRepository implements RecurringSettlementRepositoryPort {
  async upsert(settlement: RecurringSettlementEntity): Promise<void> {
    await getDb()
      .insert(recurringSettlements)
      .values({
        userId: settlement.userId,
        profileId: settlement.profileId,
        debtId: settlement.debtId,
        month: settlement.month,
        status: settlement.status,
        createdDebtId: settlement.createdDebtId,
        createdAt: settlement.createdAt,
      })
      .onConflictDoUpdate({
        target: [
          recurringSettlements.profileId,
          recurringSettlements.debtId,
          recurringSettlements.month,
        ],
        set: {
          profileId: settlement.profileId,
          status: settlement.status,
          createdDebtId: settlement.createdDebtId,
          createdAt: settlement.createdAt,
        },
      });
  }

  async listForProfileMonth(profileId: string, month: Date): Promise<RecurringSettlementEntity[]> {
    const rows = await getDb()
      .select()
      .from(recurringSettlements)
      .where(
        and(eq(recurringSettlements.profileId, profileId), eq(recurringSettlements.month, month)),
      )
      .orderBy(asc(recurringSettlements.debtId));
    return rows.map(rowToEntity);
  }

  async listForProfile(profileId: string): Promise<RecurringSettlementEntity[]> {
    const rows = await getDb()
      .select()
      .from(recurringSettlements)
      .where(eq(recurringSettlements.profileId, profileId))
      .orderBy(asc(recurringSettlements.month));
    return rows.map(rowToEntity);
  }
}
