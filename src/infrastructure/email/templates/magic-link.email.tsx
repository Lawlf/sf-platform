import { Button, Heading, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface MagicLinkEmailProps {
  appUrl: string;
  token: string;
  code: string;
}

export const MAGIC_LINK_SUBJECT = "Seu acesso ao Sabor (expira em 15 min)";

export function MagicLinkEmail({ appUrl, token, code }: MagicLinkEmailProps) {
  const verifyUrl = `${appUrl.replace(/\/$/, "")}/verificar?token=${token}`;
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Um toque e você entra, sem senha. Vale por 15 minutos."
    >
      <Heading
        as="h1"
        style={{
          margin: "0 0 12px",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: -0.4,
          color: EMAIL_COLORS.textPrimary,
        }}
      >
        Seu acesso chegou.
      </Heading>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.55,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Toca no botão abaixo e você entra direto. Sem senha, sem etapa extra.
      </Text>

      <Section style={{ textAlign: "left", margin: "0 0 28px" }}>
        <Button
          href={verifyUrl}
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
          Entrar no Sabor
        </Button>
      </Section>

      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 13,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Botão não abriu? Usa o código abaixo na tela de login.
      </Text>

      <Section
        style={{
          textAlign: "center",
          margin: "8px 0 24px",
          padding: "16px 12px",
          backgroundColor: EMAIL_COLORS.bgCream,
          borderRadius: 12,
          border: `1px solid ${EMAIL_COLORS.borderSoft}`,
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: EMAIL_COLORS.textPrimary,
            letterSpacing: 8,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
        >
          {code}
        </Text>
      </Section>

      <Text
        style={{
          margin: "0 0 8px",
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
          lineHeight: 1.5,
        }}
      >
        Esse link e código valem por 15 minutos. Se não usar a tempo, peça um novo.
      </Text>

      <Text
        style={{
          margin: 0,
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
          lineHeight: 1.5,
        }}
      >
        Não pediu pra entrar? Ignora. A gente só envia esse email quando alguém digita seu endereço
        no login.
      </Text>
    </EmailLayout>
  );
}

// Default export é exigido pelo `react-email dev` (preview server). Mantemos
// o named export pra uso no código real (route handler), e re-exportamos
// como default só pra detecção da CLI.
MagicLinkEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  token: "preview-token-abc123",
  code: "482915",
} as MagicLinkEmailProps;

export default MagicLinkEmail;
