import { sql } from "drizzle-orm";
import { bigint, date, index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profiles.schema";

export const meiMonthly = pgTable(
  "mei_monthly",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    competencia: date("competencia", { mode: "date" }).notNull(),
    proLaboreCents: bigint("pro_labore_cents", { mode: "bigint" }).notNull(),
    gastoPessoalPjCents: bigint("gasto_pessoal_pj_cents", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    profileCompetenciaUniq: uniqueIndex("mei_monthly_profile_competencia_uniq").on(
      t.profileId,
      t.competencia,
    ),
    profileIdIdx: index("mei_monthly_profile_id_idx").on(t.profileId),
  }),
);

export type MeiMonthlyRow = typeof meiMonthly.$inferSelect;
export type NewMeiMonthlyRow = typeof meiMonthly.$inferInsert;
