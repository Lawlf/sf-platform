import { and, count, desc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/infrastructure/persistence/drizzle/client";
import { feedbackEvents } from "@/infrastructure/persistence/drizzle/schema/feedback-events.schema";
import { R2FileStorage } from "@/infrastructure/storage/r2-file-storage";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export type MyContactStatus = "aberto" | "respondido" | "fechado";

export interface MyContactRow {
  id: string;
  kind: string | null;
  comment: string | null;
  status: MyContactStatus;
  hasReply: boolean;
  createdAt: Date;
}

export interface MyContactDetail {
  id: string;
  kind: string | null;
  comment: string | null;
  status: MyContactStatus;
  adminReply: string | null;
  answeredAt: Date | null;
  attachmentUrls: string[];
  createdAt: Date;
}

export async function listMyContacts(): Promise<MyContactRow[]> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select({
      id: feedbackEvents.id,
      kind: feedbackEvents.kind,
      comment: feedbackEvents.comment,
      status: feedbackEvents.status,
      adminReply: feedbackEvents.adminReply,
      createdAt: feedbackEvents.createdAt,
    })
    .from(feedbackEvents)
    .where(and(eq(feedbackEvents.userId, user.id), isNotNull(feedbackEvents.kind)))
    .orderBy(desc(feedbackEvents.createdAt))
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    comment: r.comment,
    status: r.status,
    hasReply: r.adminReply !== null,
    createdAt: r.createdAt,
  }));
}

export async function countMyContacts(): Promise<number> {
  const user = await requireUser();
  const db = getDb();
  const [r] = await db
    .select({ n: count() })
    .from(feedbackEvents)
    .where(and(eq(feedbackEvents.userId, user.id), isNotNull(feedbackEvents.kind)));
  return r?.n ?? 0;
}

export async function getMyContact(id: string): Promise<MyContactDetail | null> {
  const user = await requireUser();
  const db = getDb();
  const [row] = await db
    .select({
      id: feedbackEvents.id,
      kind: feedbackEvents.kind,
      comment: feedbackEvents.comment,
      status: feedbackEvents.status,
      adminReply: feedbackEvents.adminReply,
      answeredAt: feedbackEvents.answeredAt,
      attachmentKeys: feedbackEvents.attachmentKeys,
      createdAt: feedbackEvents.createdAt,
    })
    .from(feedbackEvents)
    .where(and(eq(feedbackEvents.id, id), eq(feedbackEvents.userId, user.id)))
    .limit(1);

  if (!row) return null;

  const storage = new R2FileStorage();
  const attachmentUrls = await Promise.all(
    row.attachmentKeys.map((k) => storage.presignDownload(k, "anexo", 60 * 60)),
  );

  return {
    id: row.id,
    kind: row.kind,
    comment: row.comment,
    status: row.status,
    adminReply: row.adminReply,
    answeredAt: row.answeredAt,
    attachmentUrls,
    createdAt: row.createdAt,
  };
}
