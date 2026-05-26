import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const userCredentials = pgTable("user_credentials", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  totpSecret: text("totp_secret"),
  pinHash: text("pin_hash"),
  appLockEnabled: boolean("app_lock_enabled").notNull().default(false),
  appLockTimeout: integer("app_lock_timeout").notNull().default(60),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

export type UserCredentialsRow = typeof userCredentials.$inferSelect;
export type NewUserCredentialsRow = typeof userCredentials.$inferInsert;
