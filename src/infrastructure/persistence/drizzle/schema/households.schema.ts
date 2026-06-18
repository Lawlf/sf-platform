import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const householdRole = pgEnum("household_role", ["admin", "member"]);
export const householdInviteStatus = pgEnum("household_invite_status", [
  "pending",
  "accepted",
  "declined",
  "revoked",
]);

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const householdMembers = pgTable(
  "household_members",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: householdRole("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.householdId, t.userId] }),
    userIdx: index("household_members_user_id_idx").on(t.userId),
  }),
);

export const householdInvites = pgTable(
  "household_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteeRef: text("invitee_ref").notNull(),
    status: householdInviteStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => ({
    inviteeRefStatusIdx: index("household_invites_invitee_ref_status_idx").on(
      t.inviteeRef,
      t.status,
    ),
  }),
);

export type HouseholdRow = typeof households.$inferSelect;
export type NewHouseholdRow = typeof households.$inferInsert;

export type HouseholdMemberRow = typeof householdMembers.$inferSelect;
export type NewHouseholdMemberRow = typeof householdMembers.$inferInsert;

export type HouseholdInviteRow = typeof householdInvites.$inferSelect;
export type NewHouseholdInviteRow = typeof householdInvites.$inferInsert;
