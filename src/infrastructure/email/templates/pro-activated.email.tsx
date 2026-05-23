import { Button, Heading, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface ProActivatedEmailProps {
  appUrl: string;
  /** Primeiro nome do usuário. Pode ser null se não houver. */
  firstName: string | null;
  /** Rótulo legível do plano. Ex: "Pro mensal", "Pro anual" */
  plan: string;
  /** Valor pago formatado em PT-BR. Ex: "R$ 19,90", "R$ 199,00" */
  amountLabel: string;
  /** Data da próxima cobrança formatada. Ex: "14 de junho de 2026" */
  nextChargeDateLabel: string;
}

export const PRO_ACTIVATED_SUBJECT = "Seu Pro tá no ar. Agora o mês inteiro é seu.";

export function ProActivatedEmail({
  appUrl,
  firstName,
  plan,
  amountLabel,
  nextChargeDateLabel,
}: ProActivatedEmailProps) {
  const safeUrl = appUrl.replace(/\/$/, "");
  const ctaUrl = `${safeUrl}/app`;
  const subscriptionUrl = `${safeUrl}/app/perfil/assinatura`;
  const greetSuffix = firstName ? `, ${firstName}` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Bem-vindo ao Pro. Linha do tempo destravada, B3, cripto, FII e avisos liberados."
    >
      <Section style={{ margin: "0 0 24px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #1f1d1c 0%, #2a2725 60%, #1f1d1c 100%)",
            borderRadius: 16,
            padding: "26px 22px 22px",
            textAlign: "center",
            border: `1px solid ${EMAIL_COLORS.borderSoft}`,
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 999,
              backgroundColor: "rgba(242,142,37,0.18)",
              color: "#f5a55a",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            ✦  Pro ativo  ✦
          </div>

          <Text
            style={{
              margin: "0 0 18px",
              fontSize: 18,
              fontWeight: 700,
              color: "#fdf8f3",
              letterSpacing: -0.3,
            }}
          >
            Bem-vindo ao clube{greetSuffix}.
          </Text>

          <table
            role="presentation"
            cellPadding={0}
            cellSpacing={0}
            border={0}
            style={{ margin: "0 auto", borderCollapse: "separate", borderSpacing: 6 }}
          >
            <tbody>
              <tr>
                <td>
                  <FeatureChip label="B3" />
                </td>
                <td>
                  <FeatureChip label="Cripto" />
                </td>
                <td>
                  <FeatureChip label="FII" />
                </td>
                <td>
                  <FeatureChip label="Avisos" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Heading
        as="h1"
        style={{
          margin: "0 0 12px",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: -0.4,
          color: EMAIL_COLORS.textPrimary,
        }}
      >
        Bem-vindo ao Pro{greetSuffix}.
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
        <span style={{ color: EMAIL_COLORS.brandOrangeDark }}>
          O Pro mostra o mês inteiro.
        </span>
      </Text>

      <Text
        style={{
          margin: "0 0 28px",
          fontSize: 15,
          lineHeight: 1.65,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Pagamento entrou, Pro ligado. Patrimônio, dívida, renda, tudo na mesma linha do tempo, no
        seu ritmo. Bom te ter aqui.
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
        O que destravou:
      </Heading>

      <Section style={{ margin: "0 0 28px" }}>
        <BulletItem>Linha do tempo completa, mês a mês, sem corte.</BulletItem>
        <BulletItem>B3 e cripto cotando ao vivo dentro do seu patrimônio.</BulletItem>
        <BulletItem>FII com rendimento e variação aparecendo no mês.</BulletItem>
        <BulletItem>Avisos no celular quando dívida vence ou preço mexe.</BulletItem>
      </Section>

      <Section style={{ textAlign: "left", margin: "0 0 28px" }}>
        <Button
          href={ctaUrl}
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
          Ver meu mês agora
        </Button>
      </Section>

      <Section
        style={{
          margin: "0 0 16px",
          padding: "14px 16px",
          backgroundColor: EMAIL_COLORS.bgCream,
          borderRadius: 12,
          border: `1px solid ${EMAIL_COLORS.borderSoft}`,
        }}
      >
        <Text
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: EMAIL_COLORS.textMuted,
          }}
        >
          Detalhes da assinatura
        </Text>
        <SummaryRow label="Plano" value={plan} />
        <SummaryRow label="Valor" value={amountLabel} />
        <SummaryRow label="Próxima cobrança" value={nextChargeDateLabel} isLast />
      </Section>

      <Text
        style={{
          margin: 0,
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
          lineHeight: 1.55,
        }}
      >
        Sem fidelidade. Cancelar é em{" "}
        <a
          href={subscriptionUrl}
          style={{ color: EMAIL_COLORS.textSecondary, textDecoration: "underline" }}
        >
          /app/perfil/assinatura
        </a>
        , e o Pro segue até o fim do período que você pagou. Antes da próxima cobrança, a gente
        avisa.
      </Text>
    </EmailLayout>
  );
}

function FeatureChip({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "inline-block",
        padding: "7px 12px",
        borderRadius: 999,
        backgroundColor: "rgba(253,248,243,0.08)",
        border: "1px solid rgba(253,248,243,0.14)",
        color: "#fdf8f3",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "6px 0",
        borderBottom: isLast ? "none" : `1px solid ${EMAIL_COLORS.borderSoft}`,
      }}
    >
      <span style={{ fontSize: 12, color: EMAIL_COLORS.textMuted, fontWeight: 600 }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          color: EMAIL_COLORS.textPrimary,
          fontWeight: 700,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "0 0 8px",
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
      {children}
    </Text>
  );
}

ProActivatedEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  firstName: "Marina",
  plan: "Pro mensal",
  amountLabel: "R$ 19,90",
  nextChargeDateLabel: "22 de junho de 2026",
} as ProActivatedEmailProps;

export default ProActivatedEmail;
