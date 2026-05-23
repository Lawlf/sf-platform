import { Button, Heading, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface ProActivatedEmailProps {
  appUrl: string;
  /** Primeiro nome do usuário. Pode ser null se não houver. */
  firstName: string | null;
  /** Rótulo legível do plano. Ex: "Pro mensal", "Pro anual" */
  plan: string;
  /** Valor pago formatado em PT-BR. Ex: "R$ 14,90", "R$ 119,00" */
  amountLabel: string;
  /** Data da próxima cobrança formatada. Ex: "14 de junho de 2026" */
  nextChargeDateLabel: string;
}

export const PRO_ACTIVATED_SUBJECT = "Deu certo, seu Pro tá no ar";

export function ProActivatedEmail({
  appUrl,
  firstName,
  plan,
  amountLabel,
  nextChargeDateLabel,
}: ProActivatedEmailProps) {
  const safeUrl = appUrl.replace(/\/$/, "");
  const ctaUrl = `${safeUrl}/app/perfil/notificacoes`;
  const subscriptionUrl = `${safeUrl}/app/perfil/assinatura`;
  const greetSuffix = firstName ? `, ${firstName}` : "";
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Pagamento confirmado. Histórico completo, B3, criptos e avisos liberados."
    >
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
        Deu certo{greetSuffix}. Seu Pro tá no ar.
      </Heading>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.6,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Pagamento processado e o Pro já tá ligado na sua conta.
      </Text>

      <Section
        style={{
          margin: "0 0 8px",
          padding: "16px 18px",
          backgroundColor: EMAIL_COLORS.bgCream,
          borderRadius: 12,
          border: `1px solid ${EMAIL_COLORS.borderSoft}`,
        }}
      >
        <SummaryRow label="Plano" value={plan} />
        <SummaryRow label="Valor pago" value={amountLabel} />
        <SummaryRow label="Próxima cobrança" value={nextChargeDateLabel} isLast />
      </Section>

      <Text
        style={{
          margin: "0 0 28px",
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
        }}
      >
        A gente manda lembrete antes da próxima cobrança.
      </Text>

      <Heading
        as="h2"
        style={{
          margin: "0 0 10px",
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: -0.2,
          color: EMAIL_COLORS.textPrimary,
        }}
      >
        O que liberou agora:
      </Heading>

      <Section style={{ margin: "0 0 28px" }}>
        <BulletItem>
          Histórico completo da sua linha do tempo, sem corte de meses anteriores.
        </BulletItem>
        <BulletItem>
          Ações da B3 e criptomoedas com cotação ao vivo, somadas ao seu patrimônio.
        </BulletItem>
        <BulletItem>Fundos imobiliários com rendimento e variação mensal.</BulletItem>
        <BulletItem>
          Avisos no celular quando uma dívida tá pra vencer ou um preço mexe.
        </BulletItem>
      </Section>

      <Section style={{ textAlign: "left", margin: "0 0 24px" }}>
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
          Configurar meus avisos
        </Button>
      </Section>

      <Text
        style={{
          margin: 0,
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
          lineHeight: 1.55,
        }}
      >
        Sem fidelidade. Quando quiser cancelar, é em{" "}
        <a
          href={subscriptionUrl}
          style={{ color: EMAIL_COLORS.textSecondary, textDecoration: "underline" }}
        >
          /app/perfil/assinatura
        </a>
        , e o Pro continua até o fim do período que você pagou.
      </Text>
    </EmailLayout>
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
        padding: "8px 0",
        borderBottom: isLast ? "none" : `1px solid ${EMAIL_COLORS.borderSoft}`,
      }}
    >
      <span style={{ fontSize: 12, color: EMAIL_COLORS.textMuted, fontWeight: 600 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
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
  amountLabel: "R$ 14,90",
  nextChargeDateLabel: "22 de junho de 2026",
} as ProActivatedEmailProps;

export default ProActivatedEmail;
