import type { Metadata } from "next";

import { BreadcrumbJsonLd } from "../_components/json-ld";
import { LandingFooter } from "../_components/landing-footer";
import { LandingHeader } from "../_components/landing-header";
import { LandingWhyExists } from "../_components/landing-why-exists";

export const metadata: Metadata = {
  title: "Por que existe",
  description:
    "Por que o Sabor Financeiro existe: finança não precisa virar segundo emprego. Em vez de anotar cada gasto, a gente mostra o mês inteiro do seu dinheiro.",
  alternates: { canonical: "/por-que-existe" },
  openGraph: {
    title: "Por que o Sabor Financeiro existe",
    description:
      "Finança não precisa virar segundo emprego. A gente mostra o mês inteiro do seu dinheiro, sem te obrigar a anotar cada gasto.",
    url: "/por-que-existe",
  },
};

export default function PorQueExistePage() {
  return (
    <div className="relative isolate min-h-screen bg-warm-gradient">
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Por que existe", url: "/por-que-existe" },
        ]}
      />
      <div aria-hidden className="bg-blob-top-right" />
      <div aria-hidden className="bg-blob-bottom-left" />

      <LandingHeader />
      <main id="conteudo" className="relative">
        <LandingWhyExists />
      </main>
      <LandingFooter />
    </div>
  );
}
