import { SOCIAL_LINKS } from "@/app/_shared/brand-social";

import { faqItems } from "../_lib/faq-items";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";

function JsonLdScript({ data, id }: { data: unknown; id: string }) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sabor Financeiro",
    url: siteUrl,
    logo: `${siteUrl}/icons/icon-512.png`,
    description:
      "Painel macro de patrimônio, dívida e renda para quem quer enxergar a trajetória financeira além do saldo do dia.",
    foundingDate: "2026",
    areaServed: { "@type": "Country", name: "Brasil" },
    sameAs: SOCIAL_LINKS.map((link) => link.href),
  };
  return <JsonLdScript data={data} id="ld-organization" />;
}

export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sabor Financeiro",
    url: siteUrl,
    inLanguage: "pt-BR",
    publisher: { "@type": "Organization", name: "Sabor Financeiro" },
  };
  return <JsonLdScript data={data} id="ld-website" />;
}

export function SoftwareApplicationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Sabor Financeiro",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, Android, iOS (PWA)",
    description:
      "Aplicativo web PWA para gestão macro de dívidas, renda e patrimônio. Simuladores de financiamento, juros compostos e projeção de quitação.",
    url: siteUrl,
    inLanguage: "pt-BR",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "BRL",
        category: "free",
        priceSpecification: {
          "@type": "PriceSpecification",
          price: "0",
          priceCurrency: "BRL",
        },
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "19.90",
        priceCurrency: "BRL",
        category: "subscription",
        url: `${siteUrl}/precos`,
        priceSpecification: {
          "@type": "PriceSpecification",
          price: "19.90",
          priceCurrency: "BRL",
        },
      },
    ],
    featureList: [
      "Painel de patrimônio, dívida e renda",
      "Simulador de financiamento (SAC e PRICE)",
      "Simulador de juros compostos",
      "Comparador de empréstimos",
      "Linha do tempo de evolução financeira",
      "PWA instalável no celular",
      "Custo real da dívida: os juros somados",
      "Conformidade LGPD",
    ],
  };
  return <JsonLdScript data={data} id="ld-software-application" />;
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
    })),
  };
  return <JsonLdScript data={data} id="ld-breadcrumb" />;
}

export function SoftwareToolJsonLd({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: `${siteUrl}${path}`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      priceSpecification: {
        "@type": "PriceSpecification",
        price: "0",
        priceCurrency: "BRL",
      },
    },
    publisher: { "@type": "Organization", name: "Sabor Financeiro" },
  };
  return <JsonLdScript data={data} id="ld-webapplication" />;
}

export function FaqPageJsonLd({
  items,
  id = "ld-faq",
}: {
  items: { q: string; a: string }[];
  id?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return <JsonLdScript data={data} id={id} />;
}

export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
  return <JsonLdScript data={data} id="ld-faq" />;
}
