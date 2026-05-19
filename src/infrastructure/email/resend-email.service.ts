import { Resend } from "resend";

import type { EmailMessage, EmailService } from "@/domain/ports/services/email.service";
import { requireResendConfig } from "@/infrastructure/config/env";

import { getSenderFor } from "./senders";

export class ResendEmailService implements EmailService {
  private readonly client: Resend;

  constructor() {
    const cfg = requireResendConfig();
    this.client = new Resend(cfg.apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    const from = getSenderFor(message.purpose);
    const result = await this.client.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`);
    }
  }
}
