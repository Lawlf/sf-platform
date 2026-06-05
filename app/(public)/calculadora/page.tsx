import type { Metadata } from "next";

import { BreadcrumbJsonLd } from "../_components/json-ld";
import { RevealOnScroll } from "../_components/reveal-on-scroll";

import { CalcBrowser } from "./_components/calc-browser.client";
import { CalcShell } from "./_components/calc-shell";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://saborfinanceiro.com.br";

export const metadata: Metadata = {
  title: "Calculadoras financeiras grátis",
  description:
    "Calculadoras financeiras gratuitas: salário líquido CLT, juros compostos, reserva de emergência e mais. Sem cadastro, direto no navegador.",
  alternates: { canonical: "/calculadora" },
  openGraph: {
    title: "Calculadoras financeiras grátis",
    description:
      "Calculadoras financeiras gratuitas para o dia a dia: salário, dívidas, investimento e decisões. Sem cadastro.",
    url: `${siteUrl}/calculadora`,
    type: "website",
  },
};

export default function CalculadorasHubPage() {
  return (
    <CalcShell width="wide" back={{ href: "/", label: "Início" }}>
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Calculadoras", url: "/calculadora" },
        ]}
      />

      <RevealOnScroll as="div" className="mb-10 max-w-2xl">
        <h1
          className="text-3xl font-extrabold text-[color:var(--text-primary)] sm:text-[2.75rem] sm:leading-[1.05]"
          style={{ letterSpacing: "-0.035em" }}
        >
          Calculadoras financeiras
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[color:var(--text-secondary)] sm:text-lg">
          Resolva uma conta na hora, direto no navegador. Salário, dívidas, investimento e as
          decisões do dia a dia, com a mesma lente macro do Sabor Financeiro.
        </p>
      </RevealOnScroll>

      <CalcBrowser />
    </CalcShell>
  );
}
