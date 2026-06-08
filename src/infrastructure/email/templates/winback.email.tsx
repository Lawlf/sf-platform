import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface WinbackEmailProps {
  appUrl: string;
  displayName: string | null;
  unsubscribeUrl: string;
}

export const WINBACK_SUBJECT = "O Pro foi, mas o seu mês continua aí.";

export function WinbackEmail({ appUrl, displayName, unsubscribeUrl }: WinbackEmailProps) {
  const planUrl = `${appUrl.replace(/\/$/, "")}/app/configuracoes/planos`;
  const greeting = displayName ? `${displayName}, ` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Tudo que você registrou continua intacto. Voltar é do mesmo ponto."
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
        Faz um tempo que o Pro foi.
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
        Nada foi apagado.{" "}
        <span style={{ color: EMAIL_COLORS.brandOrangeDark }}>Seu mês continua inteiro.</span>
      </Text>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}tudo que você registrou tá no mesmo lugar, esperando. Se quiser voltar pro Pro,
        é direto, do mesmo ponto: linha do tempo completa, simular, importar extrato e perguntar pros
        seus números. Sem pressa, no seu ritmo.
      </Text>

      <Section style={{ textAlign: "left", margin: "0 0 24px" }}>
        <Button
          href={planUrl}
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
          Voltar pro Pro
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
        Se for pra ficar no Free por enquanto, também funciona. O mês fica aí de qualquer jeito.
      </Text>
    </EmailLayout>
  );
}

WinbackEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
  unsubscribeUrl: "http://localhost:3000/email/unsubscribe?token=preview",
} as WinbackEmailProps;

export default WinbackEmail;
