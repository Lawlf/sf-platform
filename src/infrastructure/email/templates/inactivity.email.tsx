import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface InactivityEmailProps {
  appUrl: string;
  displayName: string | null;
  unsubscribeUrl: string;
}

export const INACTIVITY_SUBJECT = "Faz um tempo. Seu mês tá te esperando.";

export function InactivityEmail({ appUrl, displayName, unsubscribeUrl }: InactivityEmailProps) {
  const appHome = `${appUrl.replace(/\/$/, "")}/app`;
  const greeting = displayName ? `${displayName}, ` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Dois minutos pra ver onde seu dinheiro parou e seguir daí."
      unsubscribeNode={
        <Link href={unsubscribeUrl} style={{ color: EMAIL_COLORS.textSecondary }}>
          Descadastrar
        </Link>
      }
    >
      <Heading
        as="h1"
        style={{
          margin: "0 0 14px",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: -0.4,
          color: EMAIL_COLORS.textPrimary,
        }}
      >
        Faz um tempo que você não aparece.
      </Heading>

      <Text
        style={{
          margin: "0 0 18px",
          fontSize: 18,
          fontWeight: 800,
          lineHeight: 1.3,
          letterSpacing: -0.3,
          color: EMAIL_COLORS.textPrimary,
        }}
      >
        Tá tudo onde você deixou.{" "}
        <span style={{ color: EMAIL_COLORS.brandOrangeDark }}>Nada se perdeu.</span>
      </Text>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}dinheiro não precisa de atenção todo dia. Mas de vez em quando vale dar uma olhada
        pra ver onde patrimônio, dívida e renda pararam. Dois minutos e você segue daí.
      </Text>

      <Section style={{ textAlign: "left", margin: "0 0 24px" }}>
        <Button
          href={appHome}
          style={{
            backgroundImage: `linear-gradient(135deg, #f28e25, ${EMAIL_COLORS.brandOrange})`,
            backgroundColor: EMAIL_COLORS.brandOrange,
            color: "#ffffff",
            padding: "14px 24px",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Abrir o Sabor
        </Button>
      </Section>

      <Text
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          color: EMAIL_COLORS.textMuted,
        }}
      >
        Sem cobrança. Quando fizer sentido pra você, o Sabor tá aqui.
      </Text>
    </EmailLayout>
  );
}

InactivityEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
  unsubscribeUrl: "http://localhost:3000/email/unsubscribe?token=preview",
} as InactivityEmailProps;

export default InactivityEmail;
