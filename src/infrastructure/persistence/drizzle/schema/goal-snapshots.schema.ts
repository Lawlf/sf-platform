import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { goals } from "./goals.schema";

export const goalSnapshots = pgTable(
  "goal_snapshots",
  {
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    month: date("month", { mode: "date" }).notNull(),
    currentCents: bigint("current_cents", { mode: "bigint" }).notNull(),
    targetCents: bigint("target_cents", { mode: "bigint" }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.goalId, t.month] }),
  }),
);

export type GoalSnapshotRow = typeof goalSnapshots.$inferSelect;
export type NewGoalSnapshotRow = typeof goalSnapshots.$inferInsert;
