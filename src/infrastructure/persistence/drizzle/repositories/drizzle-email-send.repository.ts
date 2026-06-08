import { and, eq, gte } from "drizzle-orm";

import type { EmailSendRepository } from "@/domain/ports/repositories/email-send.repository";

import { getDb } from "../client";
import { emailSends } from "../schema/email-sends.schema";

export class DrizzleEmailSendRepository implements EmailSendRepository {
  async recordSend(input: {
    userId: string;
    kind: string;
    dedupeKey?: string | null;
  }): Promise<{ recorded: boolean }> {
    const dedupeKey = input.dedupeKey ?? null;

    if (dedupeKey) {
      const existing = await getDb()
        .select({ id: emailSends.id })
        .from(emailSends)
        .where(and(eq(emailSends.userId, input.userId), eq(emailSends.dedupeKey, dedupeKey)))
        .limit(1);
      if (existing.length > 0) return { recorded: false };
    }

    try {
      await getDb()
        .insert(emailSends)
        .values({ userId: input.userId, kind: input.kind, dedupeKey });
      return { recorded: true };
    } catch {
      return { recorded: false };
    }
  }

  async hasSentSince(userId: string, since: Date): Promise<boolean> {
    const rows = await getDb()
      .select({ id: emailSends.id })
      .from(emailSends)
      .where(and(eq(emailSends.userId, userId), gte(emailSends.sentAt, since)))
      .limit(1);
    return rows.length > 0;
  }
}
