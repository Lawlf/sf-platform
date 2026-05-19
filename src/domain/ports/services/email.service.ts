export type EmailPurpose = "auth" | "transactional";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  purpose: EmailPurpose;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}
