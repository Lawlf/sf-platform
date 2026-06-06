import { and, desc, eq, isNull } from "drizzle-orm";

import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { Money, type Currency } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import { incomes, type IncomeRow, type NewIncomeRow } from "../schema/incomes.schema";

function rowToEntity(row: IncomeRow): IncomeEntity {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    amount: Money.fromCents(row.amountCents, row.currency as Currency),
    frequency: row.frequency,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt ?? null,
  };
}

function entityToRow(entity: IncomeEntity): NewIncomeRow {
  return {
    id: entity.id,
    userId: entity.userId,
    label: entity.label,
    amountCents: entity.amount.toCents(),
    currency: entity.amount.currency,
    frequency: entity.frequency,
    startDate: entity.startDate,
    endDate: entity.endDate,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    deletedAt: entity.deletedAt,
  };
}

export class DrizzleIncomeRepository implements IncomeRepository {
  async findById(id: string): Promise<IncomeEntity | null> {
    const rows = await getDb()
      .select()
      .from(incomes)
      .where(and(eq(incomes.id, id), isNull(incomes.deletedAt)))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listForUser(userId: string, opts?: { onlyActive?: boolean }): Promise<IncomeEntity[]> {
    const cond =
      opts?.onlyActive === true
        ? and(eq(incomes.userId, userId), eq(incomes.isActive, true), isNull(incomes.deletedAt))
        : and(eq(incomes.userId, userId), isNull(incomes.deletedAt));
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

  async softDelete(id: string, deletedAt: Date): Promise<void> {
    await getDb()
      .update(incomes)
      .set({ deletedAt, updatedAt: deletedAt })
      .where(eq(incomes.id, id));
  }

  async restore(id: string): Promise<void> {
    await getDb()
      .update(incomes)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(incomes.id, id));
  }
}
