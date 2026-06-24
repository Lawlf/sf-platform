import { and, eq } from "drizzle-orm";

import type { DebtDueAcknowledgementEntity } from "@/domain/entities/debt-due-acknowledgement.entity";
import type { DebtDueAcknowledgementRepositoryPort } from "@/domain/ports/repositories/debt-due-acknowledgement.repository";

import { getDb } from "../client";
import {
  debtDueAcknowledgements,
  type DebtDueAcknowledgementRow,
} from "../schema/debt-due-acknowledgements.schema";

function rowToEntity(row: DebtDueAcknowledgementRow): DebtDueAcknowledgementEntity {
  return {
    id: row.id,
    userId: row.userId,
    debtId: row.debtId,
    cycleIso: row.cycleIso,
    response: row.response as DebtDueAcknowledgementEntity["response"],
    respondedAt: row.respondedAt,
    createdAt: row.createdAt,
  };
}

export class DebtDueAcknowledgementRepository
  implements DebtDueAcknowledgementRepositoryPort
{
  async upsert(entity: DebtDueAcknowledgementEntity): Promise<void> {
    await getDb()
      .insert(debtDueAcknowledgements)
      .values({
        id: entity.id,
        userId: entity.userId,
        debtId: entity.debtId,
        cycleIso: entity.cycleIso,
        response: entity.response,
        respondedAt: entity.respondedAt,
        createdAt: entity.createdAt,
      })
      .onConflictDoUpdate({
        target: [debtDueAcknowledgements.debtId, debtDueAcknowledgements.cycleIso],
        set: { response: entity.response, respondedAt: entity.respondedAt },
      });
  }

  async findForDebtCycle(
    debtId: string,
    cycleIso: string,
  ): Promise<DebtDueAcknowledgementEntity | null> {
    const rows = await getDb()
      .select()
      .from(debtDueAcknowledgements)
      .where(
        and(
          eq(debtDueAcknowledgements.debtId, debtId),
          eq(debtDueAcknowledgements.cycleIso, cycleIso),
        ),
      )
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listPaidCyclesForUser(
    userId: string,
  ): Promise<{ debtId: string; cycleIso: string }[]> {
    const rows = await getDb()
      .select({
        debtId: debtDueAcknowledgements.debtId,
        cycleIso: debtDueAcknowledgements.cycleIso,
      })
      .from(debtDueAcknowledgements)
      .where(
        and(
          eq(debtDueAcknowledgements.userId, userId),
          eq(debtDueAcknowledgements.response, "paid"),
        ),
      );
    return rows;
  }
}
