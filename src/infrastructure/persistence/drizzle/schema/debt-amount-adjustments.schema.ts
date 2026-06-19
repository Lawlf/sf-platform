import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { debts } from "./debts.schema";
import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

// Tipo de ajuste no valor mensal de uma dívida ao longo do tempo:
// - "period": faixa contínua de meses com valor fixo (ex.: 2023-01..2024-12 = R$ 39,90).
// - "override": mês específico com valor diferente (ex.: 2025-03 = R$ 0 porque pulou pagamento).
// Precedência ao resolver o valor de um mês: override > period > valor base do debt.
export const debtAmountAdjustmentKind = pgEnum("debt_amount_adjustment_kind", [
  "period",
  "override",
]);

export const debtAmountAdjustments = pgTable(
  "debt_amount_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    kind: debtAmountAdjustmentKind("kind").notNull(),
    // Formato YYYY-MM para todos os campos de mês.
    // Para kind=period: startMonth obrigatório, endMonth null = aberto.
    // Para kind=override: month obrigatório, demais null.
    startMonth: text("start_month"),
    endMonth: text("end_month"),
    month: text("month"),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    debtIdx: index("debt_amount_adjustments_debt_id_idx").on(table.debtId),
    userIdx: index("debt_amount_adjustments_user_id_idx").on(table.userId),
    debtKindIdx: index("debt_amount_adjustments_debt_id_kind_idx").on(table.debtId, table.kind),
    profileIdx: index("debt_amount_adjustments_profile_id_idx").on(table.profileId),
    periodShape: check(
      "debt_amount_adjustments_period_shape",
      sql`(kind = 'period' AND start_month IS NOT NULL AND month IS NULL)
          OR (kind = 'override' AND month IS NOT NULL AND start_month IS NULL AND end_month IS NULL)`,
    ),
    nonNegative: check(
      "debt_amount_adjustments_non_negative",
      sql`amount_cents >= 0`,
    ),
  }),
);

export type DebtAmountAdjustmentRow = typeof debtAmountAdjustments.$inferSelect;
export type NewDebtAmountAdjustmentRow = typeof debtAmountAdjustments.$inferInsert;
