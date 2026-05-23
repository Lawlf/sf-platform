import { sql } from "drizzle-orm";
import { bigint, boolean, index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { debts } from "./debts.schema";

export const debtPayments = pgTable(
  "debt_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    principalPortionCents: bigint("principal_portion_cents", { mode: "bigint" }).notNull(),
    interestPortionCents: bigint("interest_portion_cents", { mode: "bigint" }).notNull(),
    isExtra: boolean("is_extra").notNull().default(false),
    isClosingPayment: boolean("is_closing_payment").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    debtIdx: index("debt_payments_debt_id_idx").on(table.debtId),
    debtPaidAtIdx: index("debt_payments_debt_id_paid_at_idx").on(table.debtId, table.paidAt),
  }),
);

export type DebtPaymentRow = typeof debtPayments.$inferSelect;
export type NewDebtPaymentRow = typeof debtPayments.$inferInsert;
