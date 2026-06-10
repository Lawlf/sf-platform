import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";

import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtPaymentRepositoryPort } from "@/domain/ports/repositories/debt-payment.repository";
import { type Currency, Money } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import {
  debtPayments,
  type DebtPaymentRow,
  type NewDebtPaymentRow,
} from "../schema/debt-payments.schema";
import { debts } from "../schema/debts.schema";

function rowToEntity(row: DebtPaymentRow): DebtPaymentEntity {
  return {
    id: row.id,
    debtId: row.debtId,
    paidAt: row.paidAt,
    amount: Money.fromCents(row.amountCents, row.currency as Currency),
    principalPortion: Money.fromCents(row.principalPortionCents, row.currency as Currency),
    interestPortion: Money.fromCents(row.interestPortionCents, row.currency as Currency),
    isExtra: row.isExtra,
    // Defaults to false for rows persisted before the column existed (migration
    // 0011). Drizzle should never return undefined here once the column is in
    // place, but the fallback guards against partial-rollout states.
    isClosingPayment: row.isClosingPayment ?? false,
  };
}

function entityToRow(entity: DebtPaymentEntity): NewDebtPaymentRow {
  return {
    id: entity.id,
    debtId: entity.debtId,
    paidAt: entity.paidAt,
    amountCents: entity.amount.toCents(),
    principalPortionCents: entity.principalPortion.toCents(),
    interestPortionCents: entity.interestPortion.toCents(),
    currency: entity.amount.currency,
    isExtra: entity.isExtra,
    isClosingPayment: entity.isClosingPayment,
  };
}

export class DebtPaymentRepository implements DebtPaymentRepositoryPort {
  async listForDebt(debtId: string): Promise<DebtPaymentEntity[]> {
    const rows = await getDb()
      .select()
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debtId))
      .orderBy(asc(debtPayments.paidAt));
    return rows.map(rowToEntity);
  }

  async listForUserInRange(
    userId: string,
    range: { from: Date; to: Date },
  ): Promise<DebtPaymentEntity[]> {
    const rows = await getDb()
      .select({ p: debtPayments })
      .from(debtPayments)
      .innerJoin(debts, eq(debtPayments.debtId, debts.id))
      .where(
        and(
          eq(debts.userId, userId),
          isNull(debts.deletedAt),
          gte(debtPayments.paidAt, range.from),
          lte(debtPayments.paidAt, range.to),
        ),
      )
      .orderBy(asc(debtPayments.paidAt));
    return rows.map((r) => rowToEntity(r.p));
  }

  async create(entity: DebtPaymentEntity): Promise<DebtPaymentEntity> {
    const rows = await getDb().insert(debtPayments).values(entityToRow(entity)).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert payment");
    return rowToEntity(row);
  }

  async delete(id: string): Promise<void> {
    await getDb().delete(debtPayments).where(eq(debtPayments.id, id));
  }

  async deleteByDebtId(debtId: string): Promise<void> {
    await getDb().delete(debtPayments).where(eq(debtPayments.debtId, debtId));
  }
}
