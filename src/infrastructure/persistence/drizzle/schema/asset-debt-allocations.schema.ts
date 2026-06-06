import { sql } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { assets } from "./assets.schema";
import { debts } from "./debts.schema";

export const assetDebtAllocations = pgTable(
  "asset_debt_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    allocationOriginalCents: bigint("allocation_original_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    assetIdx: index("ada_asset_idx").on(table.assetId),
    debtIdx: index("ada_debt_idx").on(table.debtId),
    uniqueAssetDebt: unique("ada_asset_debt_uniq").on(table.assetId, table.debtId),
  }),
);

export type AssetDebtAllocationRow = typeof assetDebtAllocations.$inferSelect;
export type NewAssetDebtAllocationRow = typeof assetDebtAllocations.$inferInsert;
