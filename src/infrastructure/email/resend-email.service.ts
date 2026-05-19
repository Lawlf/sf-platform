import { Resend } from "resend";

import type { EmailMessage, EmailService } from "@/domain/ports/services/email.service";
import { requireResendConfig } from "@/infrastructure/config/env";

export class ResendEmailService implements EmailService {
  private readonly client: Resend;
  private readonly from: string;

  constructor() {
    const cfg = requireResendConfig();
    this.client = new Resend(cfg.apiKey);
    this.from = cfg.from;
  }

  async send(message: EmailMessage): Promise<void> {
    const result = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`);
    }
  }
}
