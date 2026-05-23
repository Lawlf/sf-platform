import { Button, Heading, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface ProWelcomeEmailProps {
  appUrl: string;
  displayName: string | null;
}

export const PRO_WELCOME_SUBJECT = "Te liberei o Pro. Bem-vindo.";

export function ProWelcomeEmail({ appUrl, displayName }: ProWelcomeEmailProps) {
  const dashboardUrl = `${appUrl.replace(/\/$/, "")}/app`;
  const greeting = displayName ? `${displayName}, ` : "";
  const greetSuffix = displayName ? `, ${displayName}` : " pra você";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Pro liberado na sua conta. Linha do tempo, B3, cripto, FII e avisos destravados."
    >
      <Section style={{ margin: "0 0 22px" }}>
        <div
          style={{
            display: "inline-block",
            padding: "5px 12px",
            borderRadius: 999,
            backgroundColor: "rgba(242,142,37,0.14)",
            color: EMAIL_COLORS.brandOrangeDark,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          ✦  Pro liberado
        </div>
      </Section>

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
        Pro liberado{greetSuffix}.
      </Heading>

      <Text
        style={{
          margin: "0 0 28px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}liberei o Pro na sua conta. Linha do tempo completa, B3 ao vivo, FII, cripto,
        avisos: tudo destravado, sem cobrança. Quando entrar, o mês inteiro tá lá esperando.
        Obrigado por estar aqui desde cedo.
      </Text>

      <Section style={{ textAlign: "left", margin: "0 0 28px" }}>
        <Button
          href={dashboardUrl}
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
    </EmailLayout>
  );
}

ProWelcomeEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
} as ProWelcomeEmailProps;

export default ProWelcomeEmail;
