import { and, desc, eq } from "drizzle-orm";

import type { DebtEntity, DebtStatus, InstallmentPurchase } from "@/domain/entities/debt.entity";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors";

import { getDb } from "../client";
import { debts, type DebtRow, type NewDebtRow } from "../schema/debts.schema";

function rowToEntity(row: DebtRow): DebtEntity {
  const base = {
    id: row.id,
    userId: row.userId,
    label: row.label,
    status: row.status,
    originalPrincipal: Money.fromCents(row.originalPrincipalCents),
    currentBalance: Money.fromCents(row.currentBalanceCents),
    startDate: row.startDate,
    expectedEndDate: row.expectedEndDate,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  switch (row.kind) {
    case "financing": {
      const rate = InterestRate.fromAnnual(Number(row.annualRateDecimal ?? "0"));
      if (!isOk(rate)) throw new Error("Invalid stored annualRateDecimal");
      return {
        ...base,
        kind: "financing",
        amortizationMethod: row.amortMethod ?? "PRICE",
        annualInterestRate: rate.value,
        termMonths: row.termMonths ?? 0,
        monthlyInsurance: row.monthlyInsuranceCents
          ? Money.fromCents(row.monthlyInsuranceCents)
          : null,
        monthlyAdminFee: row.monthlyAdminFeeCents
          ? Money.fromCents(row.monthlyAdminFeeCents)
          : null,
      } as DebtEntity;
    }
    case "personal_loan": {
      const rate = InterestRate.fromAnnual(Number(row.annualRateDecimal ?? "0"));
      if (!isOk(rate)) throw new Error("Invalid stored annualRateDecimal");
      return {
        ...base,
        kind: "personal_loan",
        annualInterestRate: rate.value,
        termMonths: row.termMonths ?? 0,
        monthlyInstallment: row.monthlyInstallmentCents
          ? Money.fromCents(row.monthlyInstallmentCents)
          : Money.zero(),
      } as DebtEntity;
    }
    case "credit_card": {
      const revRateRaw = row.revolvingMonthlyRateDecimal;
      const revRate = revRateRaw ? InterestRate.fromMonthly(Number(revRateRaw)) : null;
      if (revRate && !isOk(revRate)) {
        throw new Error("Invalid stored revolvingMonthlyRateDecimal");
      }
      return {
        ...base,
        kind: "credit_card",
        creditLimit: row.creditLimitCents ? Money.fromCents(row.creditLimitCents) : Money.zero(),
        statementDay: row.statementDay ?? 1,
        dueDay: row.dueDay ?? 1,
        currentStatement: row.currentStatementCents
          ? Money.fromCents(row.currentStatementCents)
          : Money.zero(),
        revolvingBalance: row.revolvingBalanceCents
          ? Money.fromCents(row.revolvingBalanceCents)
          : null,
        revolvingMonthlyRate: revRate && isOk(revRate) ? revRate.value : null,
        installmentPurchases: deserializeInstallments(row.installmentPurchases),
      } as DebtEntity;
    }
    case "overdraft": {
      const rate = InterestRate.fromMonthly(Number(row.overdraftMonthlyRateDecimal ?? "0"));
      if (!isOk(rate)) throw new Error("Invalid stored overdraftMonthlyRateDecimal");
      return {
        ...base,
        kind: "overdraft",
        bankName: row.bankName ?? "",
        monthlyRate: rate.value,
        lastChargeDate: row.lastChargeDate,
      } as DebtEntity;
    }
  }
}

function entityToRow(entity: DebtEntity): NewDebtRow {
  const base = {
    id: entity.id,
    userId: entity.userId,
    label: entity.label,
    kind: entity.kind,
    status: entity.status,
    originalPrincipalCents: entity.originalPrincipal.toCents(),
    currentBalanceCents: entity.currentBalance.toCents(),
    startDate: entity.startDate,
    expectedEndDate: entity.expectedEndDate,
    notes: entity.notes,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };

  switch (entity.kind) {
    case "financing":
      return {
        ...base,
        amortMethod: entity.amortizationMethod,
        annualRateDecimal: entity.annualInterestRate.toDecimal().toString(),
        termMonths: entity.termMonths,
        monthlyInsuranceCents: entity.monthlyInsurance?.toCents() ?? null,
        monthlyAdminFeeCents: entity.monthlyAdminFee?.toCents() ?? null,
      };
    case "personal_loan":
      return {
        ...base,
        annualRateDecimal: entity.annualInterestRate.toDecimal().toString(),
        termMonths: entity.termMonths,
        monthlyInstallmentCents: entity.monthlyInstallment.toCents(),
      };
    case "credit_card":
      return {
        ...base,
        creditLimitCents: entity.creditLimit.toCents(),
        statementDay: entity.statementDay,
        dueDay: entity.dueDay,
        currentStatementCents: entity.currentStatement.toCents(),
        revolvingBalanceCents: entity.revolvingBalance?.toCents() ?? null,
        revolvingMonthlyRateDecimal: entity.revolvingMonthlyRate?.toDecimal().toString() ?? null,
        installmentPurchases: serializeInstallments(entity.installmentPurchases),
      };
    case "overdraft":
      return {
        ...base,
        bankName: entity.bankName,
        overdraftMonthlyRateDecimal: entity.monthlyRate.toDecimal().toString(),
        lastChargeDate: entity.lastChargeDate,
      };
  }
}

interface SerializedInstallment {
  description: string;
  totalCents: string;
  installmentsTotal: number;
  installmentsRemaining: number;
  monthlyValueCents: string;
}

function deserializeInstallments(raw: unknown): InstallmentPurchase[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as SerializedInstallment[]).map((p) => ({
    description: p.description,
    total: Money.fromCents(BigInt(p.totalCents)),
    installmentsTotal: p.installmentsTotal,
    installmentsRemaining: p.installmentsRemaining,
    monthlyValue: Money.fromCents(BigInt(p.monthlyValueCents)),
  }));
}

function serializeInstallments(list: InstallmentPurchase[]): SerializedInstallment[] {
  return list.map((p) => ({
    description: p.description,
    totalCents: p.total.toCents().toString(),
    installmentsTotal: p.installmentsTotal,
    installmentsRemaining: p.installmentsRemaining,
    monthlyValueCents: p.monthlyValue.toCents().toString(),
  }));
}

export class DrizzleDebtRepository implements DebtRepository {
  async findById(id: string): Promise<DebtEntity | null> {
    const rows = await getDb().select().from(debts).where(eq(debts.id, id)).limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listForUser(userId: string, opts?: { status?: DebtStatus | "all" }): Promise<DebtEntity[]> {
    const status = opts?.status;
    const conditions =
      !status || status === "all"
        ? eq(debts.userId, userId)
        : and(eq(debts.userId, userId), eq(debts.status, status));
    const rows = await getDb()
      .select()
      .from(debts)
      .where(conditions)
      .orderBy(desc(debts.createdAt));
    return rows.map(rowToEntity);
  }

  async create(entity: DebtEntity): Promise<DebtEntity> {
    const rows = await getDb().insert(debts).values(entityToRow(entity)).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert debt");
    return rowToEntity(row);
  }

  async update(entity: DebtEntity): Promise<DebtEntity> {
    const rows = await getDb()
      .update(debts)
      .set({ ...entityToRow(entity), updatedAt: new Date() })
      .where(eq(debts.id, entity.id))
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to update debt");
    return rowToEntity(row);
  }

  async setStatus(id: string, status: DebtStatus): Promise<void> {
    await getDb().update(debts).set({ status, updatedAt: new Date() }).where(eq(debts.id, id));
  }
}
