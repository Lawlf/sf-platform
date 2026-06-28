import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import "@/shared/zod-locale";
import { StandaloneProvider } from "@/app/_shared/standalone";
import { AnalyticsConsentBanner } from "@/app/components/analytics-consent-banner";
import { AnalyticsGated } from "@/app/components/analytics-gated.client";
import { PostHogProvider } from "@/app/components/providers/posthog-provider";
import { QueryProvider } from "@/app/components/providers/query-provider";
import { Toaster } from "@/app/components/ui/sonner";
import { getA11yPrefs } from "@/theme/a11y-cookie";
import { getColorblindPreference } from "@/theme/colorblind-cookie";
import { getThemePreference } from "@/theme/theme-cookie";
import { ThemeScript } from "@/theme/theme-script";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.BING_SITE_VERIFICATION;
const yandexVerification = process.env.YANDEX_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sabor Financeiro - Sua trajetória de patrimônio, dívida e renda",
    template: "%s · Sabor Financeiro",
  },
  description:
    "Patrimônio, dívida e renda num painel só, mês a mês. Veja quanto os juros pesam e em que mês a dívida zera no ritmo atual. Sem virar planilha de centavo.",
  applicationName: "Sabor Financeiro",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Sabor Financeiro",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  keywords: [
    "controle financeiro",
    "controle financeiro para autônomo",
    "sair das dívidas",
    "calculadora de dívida",
    "juros compostos",
    "tabela SAC ou PRICE",
    "simulador de financiamento",
    "rotativo do cartão",
    "patrimônio líquido",
    "planejamento financeiro pessoal",
    "educação financeira",
    "renda variável",
    "renda irregular",
  ],
  authors: [{ name: "Sabor Financeiro" }],
  creator: "Sabor Financeiro",
  publisher: "Sabor Financeiro",
  category: "finance",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Sabor Financeiro",
    title: "Sabor Financeiro - Sua trajetória de patrimônio, dívida e renda",
    description:
      "Patrimônio, dívida e renda numa visão mensal, não numa lista de transações. Veja quanto os juros pesam e em que mês a dívida zera no ritmo atual.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sabor Financeiro - Sua trajetória de patrimônio, dívida e renda",
    description:
      "Banco mostra saldo. App de gasto mostra cada centavo. Aqui você vê a trajetória: patrimônio, dívida e renda mês a mês.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Sabor Financeiro - Sua trajetória de patrimônio, dívida e renda",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  verification: {
    ...(googleVerification && { google: googleVerification }),
    ...(yandexVerification && { yandex: yandexVerification }),
    ...(bingVerification && { other: { "msvalidate.01": bingVerification } }),
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1d1c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getThemePreference();
  const colorblind = await getColorblindPreference();
  const a11y = await getA11yPrefs();
  const initialDataTheme = theme === "light" ? "light" : "dark";
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={inter.variable}
      data-theme={initialDataTheme}
      data-cb={colorblind}
      data-density={a11y.density}
      data-motion={a11y.motion}
      data-contrast={a11y.contrast}
      style={{ fontSize: `${a11y.textsize}px` }}
    >
      <head>
        <ThemeScript />
        {/* Without JS the IntersectionObserver never reveals .sf-reveal/.sf-stagger,
            which would leave most of the page permanently at opacity:0. Force visible. */}
        <noscript>
          <style>{`.sf-reveal,.sf-stagger>*{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="font-sans antialiased">
        <PostHogProvider>
          <QueryProvider>
            <StandaloneProvider>{children}</StandaloneProvider>
          </QueryProvider>
          <AnalyticsConsentBanner />
        </PostHogProvider>
        <Toaster richColors closeButton position="top-right" />
        <AnalyticsGated />
      </body>
    </html>
  );
}
