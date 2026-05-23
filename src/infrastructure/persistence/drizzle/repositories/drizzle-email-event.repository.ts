import { getDb } from "../client";
import { emailEvents, type NewEmailEventRow } from "../schema/email-events.schema";

export interface RecordEmailEventInput {
  emailId: string;
  toEmail: string;
  eventType: string;
  occurredAt: Date;
  payload: unknown;
}

export class DrizzleEmailEventRepository {
  async record(input: RecordEmailEventInput): Promise<void> {
    const row: NewEmailEventRow = {
      emailId: input.emailId,
      toEmail: input.toEmail,
      eventType: input.eventType,
      occurredAt: input.occurredAt,
      payload: input.payload as NewEmailEventRow["payload"],
    };
    await getDb().insert(emailEvents).values(row);
  }
}
