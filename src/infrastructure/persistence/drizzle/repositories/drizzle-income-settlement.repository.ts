import { and, asc, eq } from "drizzle-orm";

import type {
  IncomeSettlementEntity,
  IncomeSettlementStatus,
} from "@/domain/entities/income-settlement.entity";
import type { IncomeSettlementRepository } from "@/domain/ports/repositories/income-settlement.repository";

import { getDb } from "../client";
import {
  incomeSettlements,
  type IncomeSettlementRow,
} from "../schema/income-settlements.schema";

function rowToEntity(row: IncomeSettlementRow): IncomeSettlementEntity {
  return {
    userId: row.userId,
    incomeId: row.incomeId,
    month: row.month,
    status: row.status as IncomeSettlementStatus,
    adjustedAmountCents: row.adjustedAmountCents,
    createdAt: row.createdAt,
  };
}

export class DrizzleIncomeSettlementRepository implements IncomeSettlementRepository {
  async upsert(settlement: IncomeSettlementEntity): Promise<void> {
    await getDb()
      .insert(incomeSettlements)
      .values({
        userId: settlement.userId,
        incomeId: settlement.incomeId,
        month: settlement.month,
        status: settlement.status,
        adjustedAmountCents: settlement.adjustedAmountCents,
        createdAt: settlement.createdAt,
      })
      .onConflictDoUpdate({
        target: [
          incomeSettlements.userId,
          incomeSettlements.incomeId,
          incomeSettlements.month,
        ],
        set: {
          status: settlement.status,
          adjustedAmountCents: settlement.adjustedAmountCents,
          createdAt: settlement.createdAt,
        },
      });
  }

  async listForUserMonth(userId: string, month: Date): Promise<IncomeSettlementEntity[]> {
    const rows = await getDb()
      .select()
      .from(incomeSettlements)
      .where(and(eq(incomeSettlements.userId, userId), eq(incomeSettlements.month, month)))
      .orderBy(asc(incomeSettlements.incomeId));
    return rows.map(rowToEntity);
  }

  async listForUser(userId: string): Promise<IncomeSettlementEntity[]> {
    const rows = await getDb()
      .select()
      .from(incomeSettlements)
      .where(eq(incomeSettlements.userId, userId))
      .orderBy(asc(incomeSettlements.month));
    return rows.map(rowToEntity);
  }
}
