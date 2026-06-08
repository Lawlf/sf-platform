import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface MonthlyNudgeEmailProps {
  appUrl: string;
  displayName: string | null;
  monthLabel: string;
  unsubscribeUrl: string;
}

export const monthlyNudgeSubject = (monthLabel: string): string =>
  `Virou ${monthLabel}. Bora fechar o mês?`;

export function MonthlyNudgeEmail({
  appUrl,
  displayName,
  monthLabel,
  unsubscribeUrl,
}: MonthlyNudgeEmailProps) {
  const timelineUrl = `${appUrl.replace(/\/$/, "")}/app/linha-do-tempo`;
  const greeting = displayName ? `${displayName}, ` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Dois minutos pra atualizar e ver a linha andar mais um mês."
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
        Virou {monthLabel}.
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
        Banco zera a fatura.{" "}
        <span style={{ color: EMAIL_COLORS.brandOrangeDark }}>Aqui o mês fica registrado pra sempre.</span>
      </Text>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}dois minutos pra atualizar o que mudou: o que entrou, o que saiu da dívida, o que
        o patrimônio fez. A linha do tempo anda mais um mês e o seu retrato fica completo.
      </Text>

      <Section style={{ textAlign: "left", margin: "0 0 24px" }}>
        <Button
          href={timelineUrl}
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
          Abrir meu mês
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
        Sem tempo agora? Tudo continua guardado, do jeito que você deixou. Volta quando der.
      </Text>
    </EmailLayout>
  );
}

MonthlyNudgeEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
  monthLabel: "junho",
  unsubscribeUrl: "http://localhost:3000/email/unsubscribe?token=preview",
} as MonthlyNudgeEmailProps;

export default MonthlyNudgeEmail;
