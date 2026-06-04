import { sql } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    description: text("description").notNull(),
    category: text("category"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    byUser: index("transactions_user_idx").on(t.userId),
    byUserOccurred: index("transactions_user_occurred_idx").on(t.userId, t.occurredAt),
  }),
);

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
