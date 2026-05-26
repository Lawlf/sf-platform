import { sql } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const webauthnCredentials = pgTable(
  "webauthn_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    credentialId: text("credential_id").notNull().unique(), // base64url
    publicKey: text("public_key").notNull(), // base64url COSE key
    counter: bigint("counter", { mode: "bigint" }).notNull().default(sql`0`),
    transports: text("transports"), // comma-joined, nullable
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    userIdx: index("webauthn_credentials_user_idx").on(table.userId),
  }),
);

export type WebauthnCredentialRow = typeof webauthnCredentials.$inferSelect;
export type NewWebauthnCredentialRow = typeof webauthnCredentials.$inferInsert;
