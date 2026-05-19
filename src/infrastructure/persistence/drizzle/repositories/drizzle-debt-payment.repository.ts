import { asc, eq } from "drizzle-orm";

import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import { Money } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import {
  debtPayments,
  type DebtPaymentRow,
  type NewDebtPaymentRow,
} from "../schema/debt-payments.schema";

function rowToEntity(row: DebtPaymentRow): DebtPaymentEntity {
  return {
    id: row.id,
    debtId: row.debtId,
    paidAt: row.paidAt,
    amount: Money.fromCents(row.amountCents),
    principalPortion: Money.fromCents(row.principalPortionCents),
    interestPortion: Money.fromCents(row.interestPortionCents),
    isExtra: row.isExtra,
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
    isExtra: entity.isExtra,
  };
}

export class DrizzleDebtPaymentRepository implements DebtPaymentRepository {
  async listForDebt(debtId: string): Promise<DebtPaymentEntity[]> {
    const rows = await getDb()
      .select()
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debtId))
      .orderBy(asc(debtPayments.paidAt));
    return rows.map(rowToEntity);
  }

  async create(entity: DebtPaymentEntity): Promise<DebtPaymentEntity> {
    const rows = await getDb().insert(debtPayments).values(entityToRow(entity)).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert payment");
    return rowToEntity(row);
  }
}
