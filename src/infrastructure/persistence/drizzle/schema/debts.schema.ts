import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const debtKind = pgEnum("debt_kind", [
  "financing",
  "personal_loan",
  "credit_card",
  "overdraft",
]);
export const debtStatus = pgEnum("debt_status", ["active", "paid_off", "written_off"]);
export const amortizationMethod = pgEnum("amortization_method", ["PRICE", "SAC"]);

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: debtKind("kind").notNull(),
    status: debtStatus("status").notNull().default("active"),
    // Money stored as cents in bigint
    originalPrincipalCents: bigint("original_principal_cents", { mode: "bigint" }).notNull(),
    currentBalanceCents: bigint("current_balance_cents", { mode: "bigint" }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    expectedEndDate: timestamp("expected_end_date", { withTimezone: true }),
    notes: text("notes"),
    // Rate stored as decimal (0.10 = 10%)
    annualRateDecimal: text("annual_rate_decimal"),
    // Term months for financing/personal_loan
    termMonths: integer("term_months"),
    // Financing-specific
    amortMethod: amortizationMethod("amort_method"),
    monthlyInsuranceCents: bigint("monthly_insurance_cents", { mode: "bigint" }),
    monthlyAdminFeeCents: bigint("monthly_admin_fee_cents", { mode: "bigint" }),
    // Personal loan-specific (annualRateDecimal + termMonths reused)
    monthlyInstallmentCents: bigint("monthly_installment_cents", { mode: "bigint" }),
    // Credit card-specific
    creditLimitCents: bigint("credit_limit_cents", { mode: "bigint" }),
    statementDay: integer("statement_day"),
    dueDay: integer("due_day"),
    currentStatementCents: bigint("current_statement_cents", { mode: "bigint" }),
    revolvingBalanceCents: bigint("revolving_balance_cents", { mode: "bigint" }),
    revolvingMonthlyRateDecimal: text("revolving_monthly_rate_decimal"),
    installmentPurchases: jsonb("installment_purchases"),
    // Overdraft-specific
    bankName: text("bank_name"),
    overdraftMonthlyRateDecimal: text("overdraft_monthly_rate_decimal"),
    lastChargeDate: timestamp("last_charge_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index("debts_user_id_idx").on(table.userId),
    userStatusIdx: index("debts_user_id_status_idx").on(table.userId, table.status),
  }),
);

export type DebtRow = typeof debts.$inferSelect;
export type NewDebtRow = typeof debts.$inferInsert;
