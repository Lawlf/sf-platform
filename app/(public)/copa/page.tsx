import { Ticket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd } from "../_components/json-ld";
import { RevealOnScroll } from "../_components/reveal-on-scroll";
import { CalcShell } from "../calculadora/_components/calc-shell";

import { activeCopaMatches } from "./_lib/copa-2026.config";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";

export const metadata: Metadata = {
  title: "Quanto custa ir à Copa do Mundo 2026?",
  description:
    "Calcule quanto custa ver os jogos do Brasil na Copa do Mundo 2026 saindo da sua cidade: voo, hotel, ingresso e extras. Calculadora grátis, sem cadastro.",
  alternates: { canonical: "/copa" },
  openGraph: {
    title: "Quanto custa ir à Copa do Mundo 2026?",
    description:
      "Veja quanto custa assistir aos jogos do Brasil na Copa do Mundo 2026: voo, hotel e ingresso, a partir da sua cidade.",
    url: `${siteUrl}/copa`,
    type: "website",
  },
};

export default function CopaIndexPage() {
  const matches = activeCopaMatches();
  return (
    <CalcShell width="wide" back={{ href: "/calculadora", label: "Calculadoras" }}>
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Copa 2026", url: "/copa" },
        ]}
      />
      <RevealOnScroll as="div" className="mb-8 max-w-2xl">
        <h1
          className="text-3xl font-extrabold text-[color:var(--text-primary)] sm:text-[2.5rem] sm:leading-[1.05]"
          style={{ letterSpacing: "-0.035em" }}
        >
          Quanto custa ver o Brasil na Copa 2026?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[color:var(--text-secondary)]">
          Escolhe o jogo e vê a estimativa de custo saindo da sua cidade: voo, hotel, ingresso, visto e extras.
        </p>
      </RevealOnScroll>
      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((m) => (
          <Link
            key={m.slug}
            href={`/copa/${m.slug}`}
            className="sf-lift focus-ring flex items-center gap-3.5 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
            style={{ boxShadow: "var(--shadow-glass-strong)" }}
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-700)]"
              aria-hidden
            >
              <Ticket size={20} strokeWidth={1.75} />
            </span>
            <span className="flex flex-col">
              <span className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
                {m.homeTeam} x {m.awayTeam}
              </span>
              <span className="text-[0.78rem] text-[color:var(--text-secondary)]">
                {m.stageLabel} · {m.venueCity}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </CalcShell>
  );
}
