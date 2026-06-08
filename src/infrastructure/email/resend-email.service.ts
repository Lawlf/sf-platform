import { Resend } from "resend";

import type { EmailMessage, EmailService } from "@/domain/ports/services/email.service";
import { requireResendConfig } from "@/infrastructure/config/env";

import { getReplyToFor, getSenderFor } from "./senders";

const SEND_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Resend send timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export class ResendEmailService implements EmailService {
  private readonly client: Resend;

  constructor() {
    const cfg = requireResendConfig();
    this.client = new Resend(cfg.apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    const from = getSenderFor(message.purpose);
    const replyTo = getReplyToFor(message.purpose);
    const result = await withTimeout(
      this.client.emails.send({
        from,
        replyTo,
        to: message.to,
        subject: message.subject,
        html: message.html,
        ...(message.headers ? { headers: message.headers } : {}),
      }),
      SEND_TIMEOUT_MS,
    );
    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`);
    }
  }
}
