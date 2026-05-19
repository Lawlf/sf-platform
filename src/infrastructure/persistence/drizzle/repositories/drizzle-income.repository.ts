import { and, desc, eq } from "drizzle-orm";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { Money } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import { incomes, type IncomeRow, type NewIncomeRow } from "../schema/incomes.schema";

function rowToEntity(row: IncomeRow): IncomeEntity {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    amount: Money.fromCents(row.amountCents),
    frequency: row.frequency,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
  };
}

function entityToRow(entity: IncomeEntity): NewIncomeRow {
  return {
    id: entity.id,
    userId: entity.userId,
    label: entity.label,
    amountCents: entity.amount.toCents(),
    frequency: entity.frequency,
    startDate: entity.startDate,
    endDate: entity.endDate,
    isActive: entity.isActive,
  };
}

export class DrizzleIncomeRepository implements IncomeRepository {
  async findById(id: string): Promise<IncomeEntity | null> {
    const rows = await getDb().select().from(incomes).where(eq(incomes.id, id)).limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listForUser(userId: string, opts?: { onlyActive?: boolean }): Promise<IncomeEntity[]> {
    const cond =
      opts?.onlyActive === true
        ? and(eq(incomes.userId, userId), eq(incomes.isActive, true))
        : eq(incomes.userId, userId);
    const rows = await getDb().select().from(incomes).where(cond).orderBy(desc(incomes.createdAt));
    return rows.map(rowToEntity);
  }

  async create(entity: IncomeEntity): Promise<IncomeEntity> {
    const rows = await getDb().insert(incomes).values(entityToRow(entity)).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert income");
    return rowToEntity(row);
  }

  async update(entity: IncomeEntity): Promise<IncomeEntity> {
    const rows = await getDb()
      .update(incomes)
      .set({ ...entityToRow(entity), updatedAt: new Date() })
      .where(eq(incomes.id, entity.id))
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to update income");
    return rowToEntity(row);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await getDb()
      .update(incomes)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(incomes.id, id));
  }
}
