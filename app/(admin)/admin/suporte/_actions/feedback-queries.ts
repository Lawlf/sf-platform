import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";

import { getDb } from "@/infrastructure/persistence/drizzle/client";
import { feedbackEvents } from "@/infrastructure/persistence/drizzle/schema/feedback-events.schema";
import { users } from "@/infrastructure/persistence/drizzle/schema/users.schema";
import { R2FileStorage } from "@/infrastructure/storage/r2-file-storage";

export type FeedbackStatusFilter = "aberto" | "respondido" | "fechado" | "todos";

export interface AdminFeedbackRow {
  id: string;
  userEmail: string | null;
  userName: string | null;
  surface: string;
  sentiment: "up" | "down" | null;
  kind: string | null;
  comment: string | null;
  attachmentCount: number;
  status: "aberto" | "respondido" | "fechado";
  createdAt: Date;
}

export interface FeedbackFilters {
  status?: FeedbackStatusFilter;
  kind?: string;
  from?: string;
  to?: string;
}

function buildWhere(filters: FeedbackFilters): SQL | undefined {
  const clauses: SQL[] = [];
  if (filters.status && filters.status !== "todos") {
    clauses.push(eq(feedbackEvents.status, filters.status));
  }
  if (filters.kind) clauses.push(eq(feedbackEvents.kind, filters.kind));
  if (filters.from) clauses.push(gte(feedbackEvents.createdAt, new Date(filters.from)));
  if (filters.to) clauses.push(lte(feedbackEvents.createdAt, new Date(`${filters.to}T23:59:59`)));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

export async function listFeedback(
  filters: FeedbackFilters,
  limit = 50,
  offset = 0,
): Promise<AdminFeedbackRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: feedbackEvents.id,
      userEmail: users.email,
      userName: users.displayName,
      surface: feedbackEvents.surface,
      sentiment: feedbackEvents.sentiment,
      kind: feedbackEvents.kind,
      comment: feedbackEvents.comment,
      attachmentKeys: feedbackEvents.attachmentKeys,
      status: feedbackEvents.status,
      createdAt: feedbackEvents.createdAt,
    })
    .from(feedbackEvents)
    .leftJoin(users, eq(users.id, feedbackEvents.userId))
    .where(buildWhere(filters))
    .orderBy(desc(feedbackEvents.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    userEmail: r.userEmail,
    userName: r.userName,
    surface: r.surface,
    sentiment: r.sentiment,
    kind: r.kind,
    comment: r.comment,
    attachmentCount: r.attachmentKeys.length,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

export interface AdminFeedbackDetail extends AdminFeedbackRow {
  userId: string;
  adminReply: string | null;
  answeredAt: Date | null;
  attachmentUrls: string[];
}

export async function getFeedback(id: string): Promise<AdminFeedbackDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: feedbackEvents.id,
      userId: feedbackEvents.userId,
      userEmail: users.email,
      userName: users.displayName,
      surface: feedbackEvents.surface,
      sentiment: feedbackEvents.sentiment,
      kind: feedbackEvents.kind,
      comment: feedbackEvents.comment,
      attachmentKeys: feedbackEvents.attachmentKeys,
      status: feedbackEvents.status,
      adminReply: feedbackEvents.adminReply,
      answeredAt: feedbackEvents.answeredAt,
      createdAt: feedbackEvents.createdAt,
    })
    .from(feedbackEvents)
    .leftJoin(users, eq(users.id, feedbackEvents.userId))
    .where(eq(feedbackEvents.id, id))
    .limit(1);

  if (!row) return null;

  const storage = new R2FileStorage();
  const attachmentUrls = await Promise.all(
    row.attachmentKeys.map((k) => storage.presignDownload(k, "anexo", 60 * 60)),
  );

  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    userName: row.userName,
    surface: row.surface,
    sentiment: row.sentiment,
    kind: row.kind,
    comment: row.comment,
    attachmentCount: row.attachmentKeys.length,
    status: row.status,
    adminReply: row.adminReply,
    answeredAt: row.answeredAt,
    createdAt: row.createdAt,
    attachmentUrls,
  };
}

export async function countFeedback(filters: FeedbackFilters): Promise<number> {
  const db = getDb();
  const [r] = await db
    .select({ n: count() })
    .from(feedbackEvents)
    .where(buildWhere(filters));
  return r?.n ?? 0;
}

export async function countOpenFeedback(): Promise<number> {
  const db = getDb();
  const [r] = await db
    .select({ n: count() })
    .from(feedbackEvents)
    .where(eq(feedbackEvents.status, "aberto"));
  return r?.n ?? 0;
}
