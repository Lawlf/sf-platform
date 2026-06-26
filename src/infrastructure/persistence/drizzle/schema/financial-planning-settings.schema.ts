import { sql } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { assets } from "./assets.schema";
import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const financialPlanningSettings = pgTable(
  "financial_planning_settings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .primaryKey()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    liquidBucketAssetId: uuid("liquid_bucket_asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    freeBalanceAccumulatedCents: bigint("free_balance_accumulated_cents", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    committedCoveredCents: bigint("committed_covered_cents", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    currentBucketMonth: text("current_bucket_month"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    profileIdx: index("financial_planning_settings_profile_id_idx").on(t.profileId),
  }),
);

export type FinancialPlanningSettingsRow = typeof financialPlanningSettings.$inferSelect;
export type NewFinancialPlanningSettingsRow = typeof financialPlanningSettings.$inferInsert;
