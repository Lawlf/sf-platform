import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const entityAttachments = pgTable(
  "entity_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    byEntity: index("entity_attachments_user_entity_idx").on(
      t.userId,
      t.entityType,
      t.entityId,
    ),
  }),
);

export type EntityAttachmentRow = typeof entityAttachments.$inferSelect;
export type NewEntityAttachmentRow = typeof entityAttachments.$inferInsert;
