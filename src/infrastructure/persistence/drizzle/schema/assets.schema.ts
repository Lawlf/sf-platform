import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const assetCategory = pgEnum("asset_category", [
  "vehicle",
  "real_estate",
  "investment",
  "cash",
  "other",
]);

export const depreciationKind = pgEnum("depreciation_kind", [
  "appreciating",
  "stable",
  "depreciating",
  "consumable",
]);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: assetCategory("category").notNull(),
    label: text("label").notNull(),
    currentValueCents: bigint("current_value_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    metadata: jsonb("metadata"),
    fipeCode: text("fipe_code"),
    fipeLastSyncedAt: timestamp("fipe_last_synced_at", { withTimezone: true }),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }),
    depreciationKind: depreciationKind("depreciation_kind").notNull().default("stable"),
    depreciationRatePctYear: numeric("depreciation_rate_pct_year", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    purchaseDate: timestamp("purchase_date", { withTimezone: true }),
    purchasePriceCents: bigint("purchase_price_cents", { mode: "bigint" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivationKind: text("deactivation_kind"),
    salePriceCents: bigint("sale_price_cents", { mode: "bigint" }),
    deactivationReason: text("deactivation_reason"),
    // Soft delete: quando preenchido, o ativo eh tratado como apagado (nao
    // aparece em listas, dashboard, timeline). Sub-records vinculados
    // (asset_debt_allocations) sao removidos de forma hard pelo use case
    // `deleteAsset`. Diferente de `deactivated_at`, que mantem o ativo
    // visivel no historico (vendido/perdido/doado).
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx: index("assets_user_id_idx").on(table.userId),
    userCategoryIdx: index("assets_user_id_category_idx").on(table.userId, table.category),
    userActiveIdx: index("assets_user_id_active_idx").on(table.userId, table.deactivatedAt),
    userDeletedIdx: index("assets_user_deleted_idx").on(table.userId, table.deletedAt),
  }),
);

export type AssetRow = typeof assets.$inferSelect;
export type NewAssetRow = typeof assets.$inferInsert;
