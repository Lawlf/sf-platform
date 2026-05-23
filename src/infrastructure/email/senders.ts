import type { EmailPurpose } from "@/domain/ports/services/email.service";

/**
 * Canonical sender per purpose, no formato `Nome <email>`. O nome de exibição
 * é o que a caixa de entrada mostra antes de abrir (ex: "Sabor Financeiro",
 * não "nao-responda"). Hardcoded porque é decisão de marca atrelada ao domínio
 * verificado no Resend, não config por deploy.
 *
 * Requires the domain `saborfinanceiro.com.br` to be verified in Resend
 * (SPF + DKIM + DMARC). If verification is missing, Resend rejects the send
 * with HTTP 403.
 *
 * Future purposes (e.g., "notifications", "marketing") add entries here.
 */
const SENDER_ADDRESS = "nao-responda@saborfinanceiro.com.br";

export const EMAIL_SENDERS: Record<EmailPurpose, string> = {
  auth: `Sabor Financeiro <${SENDER_ADDRESS}>`,
  transactional: `Sabor Financeiro <${SENDER_ADDRESS}>`,
};

export function getSenderFor(purpose: EmailPurpose): string {
  return EMAIL_SENDERS[purpose];
}
