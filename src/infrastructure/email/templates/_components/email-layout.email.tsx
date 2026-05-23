import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

export interface EmailLayoutProps {
  preview: string;
  appUrl: string;
  children: ReactNode;
  /**
   * Slot opcional no rodapé. Usado por templates de marketing pra inserir
   * link de descadastrar. Templates transacionais (magic link, recibo) não
   * passam este slot.
   */
  unsubscribeNode?: ReactNode;
}

const BRAND_ORANGE = "#ef7a1a";
const BRAND_ORANGE_DARK = "#ba5717";
const BG_CREAM = "#fdf8f3";
const SURFACE = "#ffffff";
const TEXT_PRIMARY = "#1f1d1c";
const TEXT_SECONDARY = "#3a3633";
const TEXT_MUTED = "#6b6a67";
const BORDER_SOFT = "#ece4d8";

export function EmailLayout({ preview, appUrl, children, unsubscribeNode }: EmailLayoutProps) {
  const safeUrl = appUrl.replace(/\/$/, "");
  return (
    <Html lang="pt-BR">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BG_CREAM,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          padding: "24px 0",
          margin: 0,
          color: TEXT_PRIMARY,
        }}
      >
        <Container
          style={{
            maxWidth: 520,
            margin: "0 auto",
            background: SURFACE,
            padding: 0,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${BORDER_SOFT}`,
          }}
        >
          <Section
            style={{
              padding: "20px 24px",
              backgroundColor: SURFACE,
              borderBottom: `1px solid ${BORDER_SOFT}`,
            }}
          >
            <Link
              href={safeUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: BRAND_ORANGE_DARK,
              }}
            >
              <Img
                src={resolveLogoSrc(safeUrl)}
                width={32}
                height={32}
                alt="Sabor Financeiro"
                style={{
                  display: "block",
                  borderRadius: 8,
                  border: "0",
                }}
              />
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: -0.3,
                  color: BRAND_ORANGE_DARK,
                  verticalAlign: "middle",
                }}
              >
                Sabor Financeiro
              </span>
            </Link>
          </Section>

          <Section style={{ padding: "28px 28px 24px 28px" }}>{children}</Section>

          <Hr style={{ margin: 0, border: 0, borderTop: `1px solid ${BORDER_SOFT}` }} />

          <Section style={{ padding: "20px 28px", backgroundColor: BG_CREAM }}>
            <Text
              style={{
                fontSize: 11,
                color: TEXT_MUTED,
                margin: "0 0 8px",
                lineHeight: 1.5,
              }}
            >
              Sabor Financeiro · O mês inteiro do seu dinheiro
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: TEXT_MUTED,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              <Link href={`${safeUrl}/termos`} style={{ color: TEXT_SECONDARY, marginRight: 12 }}>
                Termos
              </Link>
              <Link
                href={`${safeUrl}/privacidade`}
                style={{ color: TEXT_SECONDARY, marginRight: 12 }}
              >
                Privacidade
              </Link>
              {unsubscribeNode ? unsubscribeNode : null}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * No preview do `react-email dev` (porta 3010), o iframe não consegue carregar
 * imagens do Next dev server (`localhost:3000`) por causa do sandbox de
 * srcDoc. A solução é servir o logo do próprio react-email via pasta
 * `templates/static/`. Para qualquer outro `appUrl` (produção), usamos
 * `/icons/icon-192.png` que é o asset PWA.
 */
function resolveLogoSrc(safeUrl: string): string {
  if (safeUrl === "http://localhost:3000") return "/static/logo.png";
  return `${safeUrl}/icons/icon-192.png`;
}

export const EMAIL_COLORS = {
  brandOrange: BRAND_ORANGE,
  brandOrangeDark: BRAND_ORANGE_DARK,
  bgCream: BG_CREAM,
  surface: SURFACE,
  textPrimary: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,
  borderSoft: BORDER_SOFT,
} as const;
