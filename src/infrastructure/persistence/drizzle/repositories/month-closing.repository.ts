import { asc, desc, eq } from "drizzle-orm";

import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";
import type { MonthClosingRepositoryPort } from "@/domain/ports/repositories/month-closing.repository";

import { getDb } from "../client";
import {
  monthClosings,
  type MonthClosingRow,
} from "../schema/month-closings.schema";

function rowToEntity(row: MonthClosingRow): MonthClosingEntity {
  return {
    userId: row.userId,
    profileId: row.profileId ?? row.userId,
    month: row.month,
    baselineNetWorthCents: row.baselineNetWorthCents,
    endNetWorthCents: row.endNetWorthCents,
    theoreticalFreeCashFlowCents: row.theoreticalFreeCashFlowCents,
    leakCents: row.leakCents,
    endDebtBalanceCents: row.endDebtBalanceCents,
    endReserveCents: row.endReserveCents,
    committedPctBps: row.committedPctBps,
    closedAt: row.closedAt,
  };
}

export class MonthClosingRepository implements MonthClosingRepositoryPort {
  async upsert(closing: MonthClosingEntity): Promise<void> {
    await getDb()
      .insert(monthClosings)
      .values({
        userId: closing.userId,
        profileId: closing.profileId,
        month: closing.month,
        baselineNetWorthCents: closing.baselineNetWorthCents,
        endNetWorthCents: closing.endNetWorthCents,
        theoreticalFreeCashFlowCents: closing.theoreticalFreeCashFlowCents,
        leakCents: closing.leakCents,
        endDebtBalanceCents: closing.endDebtBalanceCents ?? null,
        endReserveCents: closing.endReserveCents ?? null,
        committedPctBps: closing.committedPctBps ?? null,
        closedAt: closing.closedAt,
      })
      .onConflictDoUpdate({
        target: [monthClosings.userId, monthClosings.month],
        set: {
          profileId: closing.profileId,
          baselineNetWorthCents: closing.baselineNetWorthCents,
          endNetWorthCents: closing.endNetWorthCents,
          theoreticalFreeCashFlowCents: closing.theoreticalFreeCashFlowCents,
          leakCents: closing.leakCents,
          endDebtBalanceCents: closing.endDebtBalanceCents ?? null,
          endReserveCents: closing.endReserveCents ?? null,
          committedPctBps: closing.committedPctBps ?? null,
          closedAt: closing.closedAt,
        },
      });
  }

  async listForProfile(profileId: string): Promise<MonthClosingEntity[]> {
    const rows = await getDb()
      .select()
      .from(monthClosings)
      .where(eq(monthClosings.profileId, profileId))
      .orderBy(asc(monthClosings.month));
    return rows.map(rowToEntity);
  }

  async latest(profileId: string): Promise<MonthClosingEntity | null> {
    const rows = await getDb()
      .select()
      .from(monthClosings)
      .where(eq(monthClosings.profileId, profileId))
      .orderBy(desc(monthClosings.month))
      .limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }
}
