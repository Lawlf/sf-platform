import { Button, Heading, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface ProWelcomeEmailProps {
  appUrl: string;
  displayName: string | null;
}

export const PRO_WELCOME_SUBJECT = "Te liberei o Pro. Sem cobrança.";

export function ProWelcomeEmail({ appUrl, displayName }: ProWelcomeEmailProps) {
  const dashboardUrl = `${appUrl.replace(/\/$/, "")}/app`;
  const greeting = displayName ? `${displayName}, ` : "";
  const greetSuffix = displayName ? `, ${displayName}` : " pra você";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Pro liberado na sua conta. Simular, importar extrato e perguntar pros seus números."
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
        Liberei o Pro{greetSuffix}.
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
        <span style={{ color: EMAIL_COLORS.brandOrangeDark }}>O Pro mostra o mês inteiro.</span>
      </Text>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        {greeting}destravei o Pro na sua conta, sem cobrança, porque você chegou cedo. Patrimônio,
        dívida e renda na mesma linha do tempo, no seu ritmo.
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
        O que abriu pra você
      </Heading>

      <Section style={{ margin: "0 0 26px" }}>
        <BulletItem title="Simula antes de decidir.">
          Pago R$ 200 a mais na parcela? A conta aparece na hora, com quantos meses somem no seu
          ritmo.
        </BulletItem>
        <BulletItem title="Importa o extrato.">
          Sobe o arquivo do banco (OFX) e o mês se monta, sem digitar tudo na mão.
        </BulletItem>
        <BulletItem title="Pergunta pros seus números.">
          {'Em português, igual mensagem: "dá pra quitar o cartão esse ano?". A resposta vem com a sua conta na frente.'}
        </BulletItem>
        <BulletItem title="Avisos no celular">quando uma dívida tá pra vencer.</BulletItem>
      </Section>

      <Section style={{ textAlign: "left", margin: "0 0 24px" }}>
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

      <Text
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          color: EMAIL_COLORS.textMuted,
        }}
      >
        Investe na bolsa? B3, FII e cripto cotam ao vivo dentro do seu patrimônio também. O mês
        inteiro já tá lá esperando. Obrigado por estar aqui desde cedo.
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

ProWelcomeEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
} as ProWelcomeEmailProps;

export default ProWelcomeEmail;
