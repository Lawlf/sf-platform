import { asc, desc, eq } from "drizzle-orm";

import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";
import type { MonthClosingRepository } from "@/domain/ports/repositories/month-closing.repository";

import { getDb } from "../client";
import {
  monthClosings,
  type MonthClosingRow,
} from "../schema/month-closings.schema";

function rowToEntity(row: MonthClosingRow): MonthClosingEntity {
  return {
    userId: row.userId,
    month: row.month,
    baselineNetWorthCents: row.baselineNetWorthCents,
    endNetWorthCents: row.endNetWorthCents,
    theoreticalFreeCashFlowCents: row.theoreticalFreeCashFlowCents,
    leakCents: row.leakCents,
    closedAt: row.closedAt,
  };
}

export class DrizzleMonthClosingRepository implements MonthClosingRepository {
  async upsert(closing: MonthClosingEntity): Promise<void> {
    await getDb()
      .insert(monthClosings)
      .values({
        userId: closing.userId,
        month: closing.month,
        baselineNetWorthCents: closing.baselineNetWorthCents,
        endNetWorthCents: closing.endNetWorthCents,
        theoreticalFreeCashFlowCents: closing.theoreticalFreeCashFlowCents,
        leakCents: closing.leakCents,
        closedAt: closing.closedAt,
      })
      .onConflictDoUpdate({
        target: [monthClosings.userId, monthClosings.month],
        set: {
          baselineNetWorthCents: closing.baselineNetWorthCents,
          endNetWorthCents: closing.endNetWorthCents,
          theoreticalFreeCashFlowCents: closing.theoreticalFreeCashFlowCents,
          leakCents: closing.leakCents,
          closedAt: closing.closedAt,
        },
      });
  }

  async listForUser(userId: string): Promise<MonthClosingEntity[]> {
    const rows = await getDb()
      .select()
      .from(monthClosings)
      .where(eq(monthClosings.userId, userId))
      .orderBy(asc(monthClosings.month));
    return rows.map(rowToEntity);
  }

  async latest(userId: string): Promise<MonthClosingEntity | null> {
    const rows = await getDb()
      .select()
      .from(monthClosings)
      .where(eq(monthClosings.userId, userId))
      .orderBy(desc(monthClosings.month))
      .limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }
}
