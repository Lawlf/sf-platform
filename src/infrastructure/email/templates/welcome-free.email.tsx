import { Button, Heading, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface WelcomeFreeEmailProps {
  appUrl: string;
  displayName: string | null;
}

export const WELCOME_FREE_SUBJECT = "Sua conta tá de pé. Falta uma coisa.";

export function WelcomeFreeEmail({ appUrl, displayName }: WelcomeFreeEmailProps) {
  const appHome = `${appUrl.replace(/\/$/, "")}/app`;
  const greeting = displayName ? `${displayName}, ` : "";
  const greetSuffix = displayName ? `, ${displayName}` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Dois minutos pra ver o seu primeiro mês tomar forma."
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
        Sua conta tá de pé{greetSuffix}.
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
        Banco mostra o saldo de hoje.{" "}
        <span style={{ color: EMAIL_COLORS.brandOrangeDark }}>Aqui você vê o mês inteiro.</span>
      </Text>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}aqui a gente não controla cafezinho. A gente mostra o que você tem, o que você
        deve e o que entra, junto, numa linha só. Pra essa linha começar a andar, registra a
        primeira coisa.
      </Text>

      <Heading
        as="h2"
        style={{
          margin: "0 0 12px",
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: -0.2,
          color: EMAIL_COLORS.textPrimary,
        }}
      >
        Começa pela dívida ou pelo que você já tem
      </Heading>

      <Section style={{ margin: "0 0 26px" }}>
        <BulletItem title="Tem uma dívida correndo juros?">
          Registra ela primeiro. Aí dá pra simular pagar um pouco a mais e ver quantos meses somem
          no seu ritmo.
        </BulletItem>
        <BulletItem title="Quer organizar o que tem?">
          Lança uma conta ou um bem. Sim, o carro e o notebook contam.
        </BulletItem>
      </Section>

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
          Registrar o primeiro
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
        No seu ritmo, sem digitar tudo de uma vez. Quando virar o mês, a gente te lembra de
        atualizar.
      </Text>
    </EmailLayout>
  );
}

function BulletItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 10px",
        fontSize: 14,
        lineHeight: 1.55,
        color: EMAIL_COLORS.textSecondary,
        paddingLeft: 18,
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 8,
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: EMAIL_COLORS.brandOrange,
        }}
      />
      <span style={{ fontWeight: 700, color: EMAIL_COLORS.textPrimary }}>{title}</span> {children}
    </Text>
  );
}

WelcomeFreeEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
} as WelcomeFreeEmailProps;

export default WelcomeFreeEmail;
