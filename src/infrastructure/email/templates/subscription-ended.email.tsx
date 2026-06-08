import { Button, Heading, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface SubscriptionEndedEmailProps {
  appUrl: string;
  displayName: string | null;
}

export const SUBSCRIPTION_ENDED_SUBJECT = "Seu Pro encerrou hoje.";

export function SubscriptionEndedEmail({ appUrl, displayName }: SubscriptionEndedEmailProps) {
  const planUrl = `${appUrl.replace(/\/$/, "")}/app/configuracoes/planos`;
  const greeting = displayName ? `${displayName}, ` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Pro foi, mês fica. Tudo que você registrou continua aí, do jeito que estava."
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
        Pro foi. Mês fica.
      </Heading>

      <Text
        style={{
          margin: "0 0 14px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}seu Pro terminou hoje. A conta voltou pro Free, mas tudo que você registrou
        continua lá, intacto. O mês inteiro tá guardado.
      </Text>

      <Text
        style={{
          margin: "0 0 28px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Se quiser voltar, é direto, do mesmo ponto. Se for hora de ficar no Free por um tempo,
        também funciona, sem perder nada.
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
          Voltar pro Pro
        </Button>
      </Section>
    </EmailLayout>
  );
}

SubscriptionEndedEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
} as SubscriptionEndedEmailProps;

export default SubscriptionEndedEmail;
