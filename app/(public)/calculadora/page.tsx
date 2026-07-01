import { Ticket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd } from "../_components/json-ld";
import { RevealOnScroll } from "../_components/reveal-on-scroll";

import { CalcBrowser } from "./_components/calc-browser.client";
import { CalcShell } from "./_components/calc-shell";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";

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

      <Link
        href="/copa/brasil-vs-noruega"
        className="sf-lift focus-ring mb-8 flex items-center gap-4 overflow-hidden rounded-[1.5rem] border border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.08] p-5 backdrop-blur-xl"
        style={{ boxShadow: "var(--shadow-glass-strong)" }}
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.16] text-[color:var(--color-brand-700)]"
          aria-hidden
        >
          <Ticket size={24} strokeWidth={1.75} />
        </span>
        <span className="flex flex-col">
          <span className="text-[0.95rem] font-extrabold text-[color:var(--text-primary)]">
            Quanto custa ver o Brasil na Copa 2026?
          </span>
          <span className="mt-0.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
            Brasil x Noruega, domingo. Voo, hotel, ingresso e extras saindo da sua cidade.
          </span>
        </span>
      </Link>

      <CalcBrowser />
    </CalcShell>
  );
}
