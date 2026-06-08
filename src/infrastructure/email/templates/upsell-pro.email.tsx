import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface UpsellProEmailProps {
  appUrl: string;
  displayName: string | null;
  unsubscribeUrl: string;
}

export const UPSELL_PRO_SUBJECT = "No Free você vê uma parte. O Pro mostra o mês inteiro.";

export function UpsellProEmail({ appUrl, displayName, unsubscribeUrl }: UpsellProEmailProps) {
  const planUrl = `${appUrl.replace(/\/$/, "")}/app/configuracoes/planos`;
  const greetSuffix = displayName ? `, ${displayName}` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Simular, importar extrato e perguntar pros seus números, sem corte."
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
        Você já pegou o jeito{greetSuffix}.
      </Heading>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Você vem usando o Sabor, e isso é o que importa. O Pro tira os limites de quem leva a sério
        o mês inteiro:
      </Text>

      <Section style={{ margin: "0 0 26px" }}>
        <BulletItem title="Simula antes de decidir.">
          Pago a mais na parcela, guardo, financio. A conta aparece na hora, no seu ritmo.
        </BulletItem>
        <BulletItem title="Importa o extrato.">
          Sobe o arquivo do banco (OFX) e o mês se monta sem digitar tudo.
        </BulletItem>
        <BulletItem title="Pergunta pros seus números.">
          {'Em português, igual mensagem: "dá pra quitar o cartão esse ano?".'}
        </BulletItem>
        <BulletItem title="Linha do tempo completa.">
          O mês inteiro, mês a mês, sem corte.
        </BulletItem>
      </Section>

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
          Ver o Pro
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
        Sem fidelidade, cancela quando quiser. Se o Free já dá conta pra você, segue tranquilo.
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

UpsellProEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  displayName: "Marina",
  unsubscribeUrl: "http://localhost:3000/email/unsubscribe?token=preview",
} as UpsellProEmailProps;

export default UpsellProEmail;
