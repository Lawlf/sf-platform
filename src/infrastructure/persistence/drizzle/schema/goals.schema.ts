import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { assets } from "./assets.schema";
import { debts } from "./debts.schema";
import { households } from "./households.schema";
import { profiles } from "./profiles.schema";
import { users } from "./users.schema";

export const goalType = pgEnum("goal_type", [
  "debt_payoff",
  "emergency_fund",
  "savings",
  "financial_independence",
]);
export const goalStatus = pgEnum("goal_status", ["active", "reached", "archived"]);
export const goalFundingMode = pgEnum("goal_funding_mode", ["linked", "manual"]);
export const goalCascadeMode = pgEnum("goal_cascade_mode", ["queue", "parallel"]);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    type: goalType("type").notNull(),
    title: text("title").notNull(),
    status: goalStatus("status").notNull().default("active"),
    targetCents: bigint("target_cents", { mode: "bigint" }),
    currency: text("currency").notNull().default("BRL"),
    deadline: date("deadline", { mode: "date" }),
    householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }),
    linkedDebtId: uuid("linked_debt_id").references(() => debts.id, { onDelete: "set null" }),
    linkedAssetId: uuid("linked_asset_id").references(() => assets.id, { onDelete: "set null" }),
    targetMonths: integer("target_months"),
    fundingMode: goalFundingMode("funding_mode"),
    manualSavedCents: bigint("manual_saved_cents", { mode: "bigint" }),
    monthlyCostCents: bigint("monthly_cost_cents", { mode: "bigint" }),
    realReturnPct: numeric("real_return_pct"),
    cascadeOrder: integer("cascade_order"),
    cascadeMode: goalCascadeMode("cascade_mode"),
    cascadeParallelPct: numeric("cascade_parallel_pct"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    byUser: index("goals_user_idx").on(t.userId),
    byUserStatus: index("goals_user_status_idx").on(t.userId, t.status),
    profileIdx: index("goals_profile_id_idx").on(t.profileId),
    householdIdx: index("goals_household_id_idx").on(t.householdId),
  }),
);

export type GoalRow = typeof goals.$inferSelect;
export type NewGoalRow = typeof goals.$inferInsert;
