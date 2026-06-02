import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Append-only trail of privileged admin actions (grant/revoke Pro, etc.).
 * Deliberately has NO foreign keys: an audit record must outlive the actor or
 * target user being deleted. actorId/targetUserId hold the user ids as plain
 * uuids for that reason.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").notNull(),
    action: text("action").notNull(),
    targetUserId: uuid("target_user_id"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    createdAtIdx: index("admin_audit_log_created_at_idx").on(table.createdAt),
    actorIdx: index("admin_audit_log_actor_idx").on(table.actorId),
    targetIdx: index("admin_audit_log_target_idx").on(table.targetUserId),
  }),
);

export type AdminAuditLogRow = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLogRow = typeof adminAuditLog.$inferInsert;
