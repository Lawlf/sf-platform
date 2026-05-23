import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface PromoDiscountEmailProps {
  appUrl: string;
  /** Percentual de desconto inteiro, ex: 30 */
  discountPercent: number;
  /** Código do cupom em uppercase, ex: ABRIL30 */
  couponCode: string;
  /** Data limite já formatada em PT-BR, ex: "30 de maio" */
  expiresAtLabel: string;
  /**
   * URL do botão. Convenção: `/precos?coupon=<code>` pra pré-aplicar o
   * cupom no checkout.
   */
  ctaUrl: string;
  /**
   * Link absoluto pra descadastrar de promoções. Obrigatório por CAN-SPAM /
   * LGPD em emails marketing.
   */
  unsubscribeUrl: string;
}

export const promoDiscountSubject = (discountPercent: number, expiresAtLabel: string): string =>
  `${discountPercent}% no Pro até ${expiresAtLabel}`;

export function PromoDiscountEmail({
  appUrl,
  discountPercent,
  couponCode,
  expiresAtLabel,
  ctaUrl,
  unsubscribeUrl,
}: PromoDiscountEmailProps) {
  return (
    <EmailLayout
      appUrl={appUrl}
      preview={`Cupom no email, vale até ${expiresAtLabel}. Cancela quando quiser, sempre foi assim.`}
      unsubscribeNode={
        <Link
          href={unsubscribeUrl}
          style={{ color: EMAIL_COLORS.textSecondary }}
        >
          Descadastrar
        </Link>
      }
    >
      <Heading
        as="h1"
        style={{
          margin: "0 0 16px",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: -0.4,
          color: EMAIL_COLORS.textPrimary,
        }}
      >
        {discountPercent}% no Pro até {expiresAtLabel}.
      </Heading>

      <Text
        style={{
          margin: "0 0 16px",
          fontSize: 15,
          lineHeight: 1.6,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        O Pro do Sabor é R$ 14,90 por mês. Com o cupom abaixo, fica {discountPercent}% mais barato
        até {expiresAtLabel}.
      </Text>

      <Text
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          lineHeight: 1.6,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Vem com histórico completo da sua linha do tempo, ações da B3 ao vivo, criptos, FIIs e
        avisos quando uma dívida tá pra vencer ou um preço mexe. A ideia é a mesma de sempre: você
        vê o mês inteiro num lugar só, sem precisar conectar banco nenhum.
      </Text>

      <Section
        style={{
          margin: "0 0 20px",
          padding: "16px 18px",
          backgroundColor: EMAIL_COLORS.bgCream,
          borderRadius: 12,
          border: `1px solid ${EMAIL_COLORS.borderSoft}`,
        }}
      >
        <Text
          style={{
            margin: "0 0 6px",
            fontSize: 12,
            color: EMAIL_COLORS.textSecondary,
          }}
        >
          Cole esse código quando for finalizar:
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 3,
            color: EMAIL_COLORS.textPrimary,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
        >
          {couponCode}
        </Text>
      </Section>

      <Section style={{ textAlign: "left", margin: "0 0 20px" }}>
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
          Assinar o Pro com {discountPercent}% off
        </Button>
      </Section>

      <Text
        style={{
          margin: "0 0 18px",
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
        }}
      >
        Vale até {expiresAtLabel}. Depois disso volta pro preço cheio.
      </Text>

      <Text
        style={{
          margin: 0,
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
          lineHeight: 1.55,
        }}
      >
        Sem fidelidade, sem multa. Cancela direto no painel a qualquer momento e o Pro fica ativo
        até o fim do período que você pagou.
      </Text>
    </EmailLayout>
  );
}

PromoDiscountEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  discountPercent: 30,
  couponCode: "MAIO30",
  expiresAtLabel: "30 de maio",
  ctaUrl: "http://localhost:3000/precos?coupon=MAIO30",
  unsubscribeUrl: "http://localhost:3000/email/unsubscribe?token=preview",
} as PromoDiscountEmailProps;

export default PromoDiscountEmail;
