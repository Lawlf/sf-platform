import type { EmailPurpose } from "@/domain/ports/services/email.service";

/**
 * Canonical sender address per purpose. Hardcoded because the sender is a
 * brand/product decision tied to the verified domain in Resend, not a per-
 * deployment configuration.
 *
 * Requires the domain `saborfinanceiro.com.br` to be verified in Resend
 * (SPF + DKIM + DMARC). If verification is missing, Resend rejects the send
 * with HTTP 403.
 *
 * Future purposes (e.g., "notifications", "marketing") add entries here.
 */
export const EMAIL_SENDERS: Record<EmailPurpose, string> = {
  auth: "nao-responda@saborfinanceiro.com.br",
  transactional: "nao-responda@saborfinanceiro.com.br",
};

export function getSenderFor(purpose: EmailPurpose): string {
  return EMAIL_SENDERS[purpose];
}
