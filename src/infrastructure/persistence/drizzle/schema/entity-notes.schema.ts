import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const entityNotes = pgTable(
  "entity_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    body: text("body").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    uniquePerEntity: unique("entity_notes_user_entity_unique").on(
      t.userId,
      t.entityType,
      t.entityId,
    ),
  }),
);

export type EntityNoteRow = typeof entityNotes.$inferSelect;
export type NewEntityNoteRow = typeof entityNotes.$inferInsert;
