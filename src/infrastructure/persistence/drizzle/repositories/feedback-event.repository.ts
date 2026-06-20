import { eq } from "drizzle-orm";

import { getDb } from "../client";
import { feedbackEvents, type NewFeedbackEventRow } from "../schema/feedback-events.schema";

export type FeedbackStatus = "aberto" | "respondido" | "fechado";

export interface RecordFeedbackInput {
  id: string;
  userId: string;
  surface: string;
  sentiment: "up" | "down" | null;
  comment: string | null;
  kind: string | null;
  attachmentKeys: string[];
  createdAt: Date;
}

export class FeedbackEventRepository {
  async record(input: RecordFeedbackInput): Promise<void> {
    const row: NewFeedbackEventRow = {
      id: input.id,
      userId: input.userId,
      surface: input.surface,
      sentiment: input.sentiment,
      comment: input.comment,
      kind: input.kind,
      attachmentKeys: input.attachmentKeys,
      createdAt: input.createdAt,
    };
    await getDb().insert(feedbackEvents).values(row);
  }

  async recordReply(id: string, reply: string, answeredAt: Date): Promise<void> {
    await getDb()
      .update(feedbackEvents)
      .set({ adminReply: reply, answeredAt, status: "respondido" })
      .where(eq(feedbackEvents.id, id));
  }

  async setStatus(id: string, status: FeedbackStatus): Promise<void> {
    await getDb().update(feedbackEvents).set({ status }).where(eq(feedbackEvents.id, id));
  }
}
