import { and, asc, eq } from "drizzle-orm";

import type {
  DebtAmountAdjustmentEntity,
  OverrideAdjustment,
  PeriodAdjustment,
} from "@/domain/entities/debt-amount-adjustment.entity";
import type { DebtAmountAdjustmentRepositoryPort } from "@/domain/ports/repositories/debt-amount-adjustment.repository";
import { type Currency, Money } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import {
  debtAmountAdjustments,
  type DebtAmountAdjustmentRow,
  type NewDebtAmountAdjustmentRow,
} from "../schema/debt-amount-adjustments.schema";

function rowToEntity(row: DebtAmountAdjustmentRow): DebtAmountAdjustmentEntity {
  const base = {
    id: row.id,
    debtId: row.debtId,
    userId: row.userId,
    amount: Money.fromCents(row.amountCents, row.currency as Currency),
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.kind === "period") {
    if (!row.startMonth) {
      throw new Error(`Period adjustment ${row.id} missing startMonth`);
    }
    return {
      ...base,
      kind: "period",
      startMonth: row.startMonth,
      endMonth: row.endMonth,
    } satisfies PeriodAdjustment;
  }
  if (!row.month) {
    throw new Error(`Override adjustment ${row.id} missing month`);
  }
  return {
    ...base,
    kind: "override",
    month: row.month,
  } satisfies OverrideAdjustment;
}

function entityToRow(entity: DebtAmountAdjustmentEntity): NewDebtAmountAdjustmentRow {
  const common = {
    id: entity.id,
    debtId: entity.debtId,
    userId: entity.userId,
    amountCents: entity.amount.toCents(),
    currency: entity.amount.currency,
    note: entity.note,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
  if (entity.kind === "period") {
    return {
      ...common,
      kind: "period",
      startMonth: entity.startMonth,
      endMonth: entity.endMonth,
      month: null,
    };
  }
  return {
    ...common,
    kind: "override",
    startMonth: null,
    endMonth: null,
    month: entity.month,
  };
}

export class DebtAmountAdjustmentRepository implements DebtAmountAdjustmentRepositoryPort {
  async listForDebt(debtId: string, userId: string): Promise<DebtAmountAdjustmentEntity[]> {
    const rows = await getDb()
      .select()
      .from(debtAmountAdjustments)
      .where(and(eq(debtAmountAdjustments.debtId, debtId), eq(debtAmountAdjustments.userId, userId)))
      .orderBy(
        asc(debtAmountAdjustments.kind),
        asc(debtAmountAdjustments.startMonth),
        asc(debtAmountAdjustments.month),
      );
    return rows.map(rowToEntity);
  }

  async listForUser(userId: string): Promise<DebtAmountAdjustmentEntity[]> {
    const rows = await getDb()
      .select()
      .from(debtAmountAdjustments)
      .where(eq(debtAmountAdjustments.userId, userId))
      .orderBy(
        asc(debtAmountAdjustments.debtId),
        asc(debtAmountAdjustments.kind),
        asc(debtAmountAdjustments.startMonth),
        asc(debtAmountAdjustments.month),
      );
    return rows.map(rowToEntity);
  }

  async upsert(entity: DebtAmountAdjustmentEntity): Promise<DebtAmountAdjustmentEntity> {
    // Override é único por (debtId, month). Se já existe, deletamos antes pra
    // garantir um único registro por mês. Períodos podem coexistir; deixamos
    // create direto.
    if (entity.kind === "override") {
      await getDb()
        .delete(debtAmountAdjustments)
        .where(
          and(
            eq(debtAmountAdjustments.debtId, entity.debtId),
            eq(debtAmountAdjustments.kind, "override"),
            eq(debtAmountAdjustments.month, entity.month),
          ),
        );
    }
    const rows = await getDb()
      .insert(debtAmountAdjustments)
      .values(entityToRow(entity))
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert debt amount adjustment");
    return rowToEntity(row);
  }

  async delete(id: string, userId: string): Promise<void> {
    await getDb()
      .delete(debtAmountAdjustments)
      .where(and(eq(debtAmountAdjustments.id, id), eq(debtAmountAdjustments.userId, userId)));
  }

  async deleteByDebtId(debtId: string): Promise<void> {
    await getDb().delete(debtAmountAdjustments).where(eq(debtAmountAdjustments.debtId, debtId));
  }
}
