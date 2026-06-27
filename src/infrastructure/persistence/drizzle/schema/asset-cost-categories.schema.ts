import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { assets } from "./assets.schema";
import { profiles } from "./profiles.schema";

export const assetCostCategories = pgTable(
  "asset_cost_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    categoryKey: text("category_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    assetIdx: index("acc_asset_idx").on(table.assetId),
    // Uma categoria de gasto pertence a no máximo um bem por perfil: o gasto não
    // pode contar pra dois dossiês ao mesmo tempo.
    uniqueProfileCategory: unique("acc_profile_category_uniq").on(
      table.profileId,
      table.categoryKey,
    ),
  }),
);

export type AssetCostCategoryRow = typeof assetCostCategories.$inferSelect;
export type NewAssetCostCategoryRow = typeof assetCostCategories.$inferInsert;
