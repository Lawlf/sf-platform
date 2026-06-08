import { Button, Heading, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface FirstDebtEmailProps {
  appUrl: string;
  displayName: string | null;
}

export const FIRST_DEBT_SUBJECT = "Primeira dívida registrada. Agora vem a parte boa.";

export function FirstDebtEmail({ appUrl, displayName }: FirstDebtEmailProps) {
  const debtsUrl = `${appUrl.replace(/\/$/, "")}/app/dividas`;
  const greeting = displayName ? `${displayName}, ` : "";
  const greetSuffix = displayName ? `, ${displayName}` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Simula pagar um pouco a mais e vê quantos meses somem, no seu ritmo."
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
        Primeira dívida no mapa{greetSuffix}.
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
        Olhar a dívida de frente é o difícil.{" "}
        <span style={{ color: EMAIL_COLORS.brandOrangeDark }}>Isso você já fez.</span>
      </Text>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}agora o Sabor faz a conta por você: joga um valor extra na simulação e vê quantos
        meses a dívida encurta, no seu ritmo. Sem promessa, só o número na sua frente pra decidir.
      </Text>

      <Section style={{ textAlign: "left", margin: "0 0 24px" }}>
        <Button
          href={debtsUrl}
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
          Simular pagar a mais
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
        Quer só perguntar? Dá pra falar com o Sabor em português, igual mensagem, e a resposta vem
        com a sua conta na frente.
      </Text>
    </EmailLayout>
  );
}

FirstDebtEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
} as FirstDebtEmailProps;

export default FirstDebtEmail;
