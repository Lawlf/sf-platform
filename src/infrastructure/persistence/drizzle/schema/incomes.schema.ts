import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const incomeFrequency = pgEnum("income_frequency", ["monthly", "weekly", "one_off"]);

export const incomes = pgTable(
  "incomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    frequency: incomeFrequency("frequency").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    // Dia do mês (1-31) em que a renda cai. null = usar o dia de start_date.
    // Alimenta o saldo reativo da Carteira (crédito na data real, não no
    // começo do mês).
    paymentDay: integer("payment_day"),
    // Renda de valor variável (comissao/freela/PJ): o valor segue sendo um
    // numero so (media), a flag so marca que e estimativa pra UI e prescricao
    // nao tratarem como receita garantida.
    isEstimated: boolean("is_estimated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    // Soft delete: quando preenchido, a renda eh tratada como apagada (nao
    // aparece em listas, dashboard, timeline). Mantemos a linha pra atender
    // LGPD/auditoria. Diferente de `is_active`, que representa
    // arquivar/reativar (visivel ao usuario como historico).
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx: index("incomes_user_id_idx").on(table.userId),
    userActiveIdx: index("incomes_user_id_active_idx").on(table.userId, table.isActive),
    userDeletedIdx: index("incomes_user_deleted_idx").on(table.userId, table.deletedAt),
    profileIdx: index("incomes_profile_id_idx").on(table.profileId),
  }),
);

export type IncomeRow = typeof incomes.$inferSelect;
export type NewIncomeRow = typeof incomes.$inferInsert;
