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
  `Janela aberta: ${discountPercent}% no Pro até ${expiresAtLabel}.`;

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
      preview={`Janela aberta até ${expiresAtLabel}. ${discountPercent}% no Pro, sem pressão.`}
      unsubscribeNode={
        <Link href={unsubscribeUrl} style={{ color: EMAIL_COLORS.textSecondary }}>
          Descadastrar
        </Link>
      }
    >
      <Section style={{ margin: "0 0 18px" }}>
        <div
          style={{
            display: "inline-block",
            padding: "5px 12px",
            borderRadius: 999,
            backgroundColor: "rgba(242,142,37,0.14)",
            color: EMAIL_COLORS.brandOrangeDark,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          ✦  Janela aberta
        </div>
      </Section>

      <Heading
        as="h1"
        style={{
          margin: "0 0 14px",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: -0.5,
          color: EMAIL_COLORS.textPrimary,
          lineHeight: 1.15,
        }}
      >
        Abriu janela no Pro.
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
        Loja que vive em promoção só disfarça o preço.{" "}
        <span style={{ color: EMAIL_COLORS.brandOrangeDark }}>
          A gente quase nunca abre.
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
        Essa fica até {expiresAtLabel}: {discountPercent}% no Pro. Se for hora, aproveita. Se não
        for, ignora sem culpa, volta quando fizer sentido.
      </Text>

      <Section style={{ margin: "0 0 24px" }}>
        <div
          style={{
            position: "relative",
            padding: "22px 22px 20px",
            borderRadius: 16,
            backgroundImage:
              "linear-gradient(135deg, rgba(242,142,37,0.10) 0%, rgba(242,142,37,0.04) 100%)",
            border: `1px dashed ${EMAIL_COLORS.brandOrange}`,
          }}
        >
          <Text
            style={{
              margin: "0 0 4px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: EMAIL_COLORS.brandOrangeDark,
            }}
          >
            Seu convite
          </Text>
          <Text
            style={{
              margin: "0 0 14px",
              fontSize: 13,
              color: EMAIL_COLORS.textSecondary,
            }}
          >
            Cupom no seu nome, válido até {expiresAtLabel}.
          </Text>
          <div
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 12,
              backgroundColor: "#ffffff",
              border: `1px solid ${EMAIL_COLORS.brandOrange}`,
              fontSize: 22,
              fontWeight: 800,
              color: EMAIL_COLORS.textPrimary,
              letterSpacing: 1.5,
            }}
          >
            {couponCode}
          </div>
          <Text
            style={{
              margin: "12px 0 0",
              fontSize: 12,
              color: EMAIL_COLORS.textMuted,
            }}
          >
            {discountPercent}% off aplicado direto no checkout.
          </Text>
        </div>
      </Section>

      <Section style={{ textAlign: "left", margin: "0 0 22px" }}>
        <Button
          href={ctaUrl}
          style={{
            backgroundImage: `linear-gradient(135deg, #f28e25, ${EMAIL_COLORS.brandOrange})`,
            backgroundColor: EMAIL_COLORS.brandOrange,
            color: "#ffffff",
            padding: "14px 26px",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Aceitar a janela
        </Button>
      </Section>

      <Text
        style={{
          margin: "0 0 18px",
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
        }}
      >
        Janela fecha em {expiresAtLabel}. Depois disso, preço cheio de volta.
      </Text>

      <Text
        style={{
          margin: 0,
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
          lineHeight: 1.55,
        }}
      >
        A regra de sempre vale aqui também: cancela quando quiser, Pro fica ativo até o fim do
        período pago, sem multa.
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
