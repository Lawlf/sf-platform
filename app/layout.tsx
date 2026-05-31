import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { AnalyticsConsentBanner } from "@/app/components/analytics-consent-banner";
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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://saborfinanceiro.com.br";
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.BING_SITE_VERIFICATION;
const yandexVerification = process.env.YANDEX_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sabor Financeiro - Saia das dívidas com clareza",
    template: "%s · Sabor Financeiro",
  },
  description:
    "Veja o tamanho real da sua dívida, quanto os juros custam e o mês em que você sai do vermelho. Painel macro de patrimônio, dívida e renda. Sem conectar banco.",
  applicationName: "Sabor Financeiro",
  manifest: "/manifest.webmanifest",
  keywords: [
    "controle financeiro",
    "sair das dívidas",
    "calculadora de dívida",
    "juros compostos",
    "amortização SAC PRICE",
    "simulador de financiamento",
    "patrimônio líquido",
    "planejamento financeiro pessoal",
    "educação financeira",
    "alternativa Open Finance",
    "finanças sem conectar banco",
    "PWA financeiro",
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
    title: "Sabor Financeiro - Saia das dívidas com clareza",
    description:
      "Painel macro de patrimônio, dívida e renda. Veja o custo real dos juros e o mês em que você sai do vermelho. Sem conectar banco.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sabor Financeiro - Saia das dívidas com clareza",
    description:
      "Painel macro de patrimônio, dívida e renda. Sem conectar banco. Sem microscópio de cafezinho.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Sabor Financeiro - Saia das dívidas com clareza",
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
          <QueryProvider>{children}</QueryProvider>
          <AnalyticsConsentBanner />
        </PostHogProvider>
        <Toaster richColors closeButton position="top-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
