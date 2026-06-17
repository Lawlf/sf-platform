import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { assets } from "./assets.schema";
import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const financialPlanningSettings = pgTable(
  "financial_planning_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    liquidBucketAssetId: uuid("liquid_bucket_asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
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
