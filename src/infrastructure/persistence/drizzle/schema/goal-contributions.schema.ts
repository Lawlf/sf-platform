import { sql } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { goals } from "./goals.schema";
import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull().default("BRL"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    byGoalCreatedAt: index("goal_contributions_goal_id_created_at_idx").on(
      t.goalId,
      t.createdAt.desc(),
    ),
    profileIdx: index("goal_contributions_profile_id_idx").on(t.profileId),
  }),
);

export type GoalContributionRow = typeof goalContributions.$inferSelect;
export type NewGoalContributionRow = typeof goalContributions.$inferInsert;
