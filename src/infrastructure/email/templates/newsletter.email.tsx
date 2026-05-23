import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { EMAIL_COLORS, EmailLayout } from "./_components/email-layout.email";

export interface NewsletterSection {
  heading: string;
  body: string;
}

export interface NewsletterEmailProps {
  appUrl: string;
  edicaoNumero: number;
  titulo: string;
  sections: NewsletterSection[];
  /**
   * Destino do botão CTA final. Default: a raiz do app autenticado.
   */
  ctaUrl?: string;
  /**
   * Link absoluto pra descadastrar da newsletter. Obrigatório por CAN-SPAM /
   * LGPD em emails marketing.
   */
  unsubscribeUrl: string;
}

export const newsletterSubject = (edicaoNumero: number, titulo: string): string =>
  `Sabor #${edicaoNumero}: ${titulo}`;

export function NewsletterEmail({
  appUrl,
  edicaoNumero,
  titulo,
  sections,
  ctaUrl,
  unsubscribeUrl,
}: NewsletterEmailProps) {
  const safeUrl = appUrl.replace(/\/$/, "");
  const finalCtaUrl = ctaUrl ?? `${safeUrl}/app`;
  return (
    <EmailLayout
      appUrl={appUrl}
      preview="Resumo do mês, sem encher de gráfico. Leitura de 3 minutos."
      unsubscribeNode={
        <Link
          href={unsubscribeUrl}
          style={{ color: EMAIL_COLORS.textSecondary }}
        >
          Descadastrar
        </Link>
      }
    >
      <Text
        style={{
          margin: "0 0 6px",
          fontSize: 13,
          fontWeight: 600,
          color: EMAIL_COLORS.textMuted,
        }}
      >
        Sabor mensal, edição {edicaoNumero}
      </Text>

      <Heading
        as="h1"
        style={{
          margin: "0 0 10px",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: -0.4,
          color: EMAIL_COLORS.textPrimary,
          lineHeight: 1.2,
        }}
      >
        {titulo}
      </Heading>

      <Text
        style={{
          margin: "0 0 28px",
          fontSize: 14,
          lineHeight: 1.55,
          color: EMAIL_COLORS.textSecondary,
        }}
      >
        Macro, produto e uma coisa pra pensar. Sempre nessa ordem.
      </Text>

      {sections.map((section, idx) => (
        <Section
          key={`${idx}-${section.heading}`}
          style={{
            marginBottom: 22,
            paddingBottom: 22,
            borderBottom:
              idx < sections.length - 1 ? `1px solid ${EMAIL_COLORS.borderSoft}` : "none",
          }}
        >
          <Heading
            as="h2"
            style={{
              margin: "0 0 8px",
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: -0.2,
              color: EMAIL_COLORS.textPrimary,
            }}
          >
            {section.heading}
          </Heading>
          <Text
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.6,
              color: EMAIL_COLORS.textSecondary,
            }}
          >
            {section.body}
          </Text>
        </Section>
      ))}

      <Section style={{ textAlign: "left", margin: "16px 0 12px" }}>
        <Button
          href={finalCtaUrl}
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
          margin: "0 0 24px",
          fontSize: 13,
          color: EMAIL_COLORS.textMuted,
        }}
      >
        Seu mês tá lá, atualizado, do jeito que você deixou.
      </Text>

      <Text
        style={{
          margin: 0,
          fontSize: 12,
          color: EMAIL_COLORS.textMuted,
          lineHeight: 1.55,
          fontStyle: "italic",
        }}
      >
        PS: se faltou alguma coisa nessa edição, responde aqui. A gente lê todas e a próxima carta
        sai um pouco menos ruim por causa de quem responde.
      </Text>
    </EmailLayout>
  );
}

NewsletterEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  edicaoNumero: 7,
  titulo: "O mês em que o IPCA assustou",
  sections: [
    {
      heading: "O número que importou",
      body: "IPCA fechou em 0,52% em abril. Pra quem tem dívida pós-fixada, isso encarece a parcela. Vê o impacto na sua linha do tempo no app.",
    },
    {
      heading: "Pro do mês",
      body: "Avisos de variação de preço agora pegam fundos imobiliários também. Se você acompanha algum FII, ativa o aviso pra cair só quando o preço mexer de verdade.",
    },
    {
      heading: "Pra ler com calma",
      body: "Publicamos um post sobre como pensar em amortização quando o Selic começa a cair. Curto, 4 minutos.",
    },
  ],
  unsubscribeUrl: "http://localhost:3000/email/unsubscribe?token=preview",
} as NewsletterEmailProps;

export default NewsletterEmail;
