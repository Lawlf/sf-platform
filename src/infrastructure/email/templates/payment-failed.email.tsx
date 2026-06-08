import { Button, Heading, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface PaymentFailedEmailProps {
  appUrl: string;
  displayName: string | null;
  accessUntil: string;
}

export const PAYMENT_FAILED_SUBJECT = "Tropeço no cartão. Nada quebrou.";

export function PaymentFailedEmail({ appUrl, displayName, accessUntil }: PaymentFailedEmailProps) {
  const planUrl = `${appUrl.replace(/\/$/, "")}/app/configuracoes/planos`;
  const greeting = displayName ? `${displayName}, ` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview={`Cobrança não passou, sem drama. Pro segue até ${accessUntil} e a gente tenta de novo.`}
    >
      <Heading
        as="h1"
        style={{
          margin: "0 0 16px",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: -0.4,
          color: EMAIL_COLORS.textPrimary,
        }}
      >
        Tropeço no cartão.
      </Heading>

      <Text
        style={{
          margin: "0 0 14px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}a cobrança do Pro não passou agora. Pode ter sido limite, vencimento, banco fora
        do ar, qualquer coisa. Nada quebrou, a gente tenta de novo automaticamente nos próximos
        dias.
      </Text>

      <Text
        style={{
          margin: "0 0 28px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Seu Pro segue rodando até {accessUntil}. Se quiser trocar de cartão antes da próxima
        tentativa, é rápido no app. Se for resolver direto no banco, dá tempo.
      </Text>

      <Section style={{ textAlign: "left", margin: "0 0 24px" }}>
        <Button
          href={planUrl}
          style={{
            backgroundImage: `linear-gradient(135deg, #f28e25, ${EMAIL_COLORS.brandOrange})`,
            backgroundColor: EMAIL_COLORS.brandOrange,
            color: "#ffffff",
            padding: "13px 22px",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Atualizar cartão
        </Button>
      </Section>
    </EmailLayout>
  );
}

PaymentFailedEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
  accessUntil: "29 de maio de 2026",
} as PaymentFailedEmailProps;

export default PaymentFailedEmail;
