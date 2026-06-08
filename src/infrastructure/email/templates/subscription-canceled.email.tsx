import { Heading, Link, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface SubscriptionCanceledEmailProps {
  appUrl: string;
  displayName: string | null;
  accessUntil: string;
}

export const SUBSCRIPTION_CANCELED_SUBJECT = "Cancelamento feito. Sua porta fica aberta.";

export function SubscriptionCanceledEmail({
  appUrl,
  displayName,
  accessUntil,
}: SubscriptionCanceledEmailProps) {
  const safeUrl = appUrl.replace(/\/$/, "");
  const reactivateUrl = `${safeUrl}/app/configuracoes/planos`;
  const greeting = displayName ? `${displayName}, ` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview={`Pro segue ativo até ${accessUntil}, sem cobrança nova. Reativar é num clique.`}
    >
      <Heading
        as="h1"
        style={{
          margin: "0 0 16px",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: -0.3,
          color: EMAIL_COLORS.textPrimary,
        }}
      >
        Cancelamento feito.
      </Heading>

      <Text
        style={{
          margin: "0 0 14px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}cancelamento registrado. Seu Pro continua rodando normal até {accessUntil}, sem
        cobrança nova, sem corte antes da hora.
      </Text>

      <Text
        style={{
          margin: "0 0 14px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Se mudar de ideia até lá, é só reativar dentro do app e segue de onde parou. Depois dessa
        data, a conta volta pro Free e o mês continua aí, do seu jeito.
      </Text>

      <Text
        style={{
          margin: "0 0 28px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Obrigado por ter testado o Pro. Quando quiser voltar, o seu mês tá no mesmo lugar.
      </Text>

      <Section
        style={{
          margin: "0 0 8px",
          padding: "14px 16px",
          backgroundColor: EMAIL_COLORS.bgCream,
          borderRadius: 12,
          border: `1px solid ${EMAIL_COLORS.borderSoft}`,
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.55,
            color: EMAIL_COLORS.textSecondary,
          }}
        >
          Mudou de ideia?{" "}
          <Link
            href={reactivateUrl}
            style={{
              color: EMAIL_COLORS.brandOrangeDark,
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            Reativar antes de {accessUntil}
          </Link>
          .
        </Text>
      </Section>
    </EmailLayout>
  );
}

SubscriptionCanceledEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
  accessUntil: "22 de junho de 2026",
} as SubscriptionCanceledEmailProps;

export default SubscriptionCanceledEmail;
