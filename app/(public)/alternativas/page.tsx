import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd } from "../_components/json-ld";
import { RevealOnScroll } from "../_components/reveal-on-scroll";
import { CalcShell } from "../calculadora/_components/calc-shell";

import { competitorSlugs, getCompetitor } from "./_lib/competitors";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";

export const metadata: Metadata = {
  title: "Apps de finanças: Sabor vs Mobills, Organizze e planilha",
  description:
    "Compare o Sabor Financeiro com Mobills, Organizze e a velha planilha. A diferença é a lente: o quadro do mês, não cada transação. E só o Sabor conecta na sua IA.",
  alternates: { canonical: "/alternativas" },
  openGraph: {
    title: "Apps de finanças: qual faz sentido pra você?",
    description:
      "Sabor vs Mobills, Organizze e planilha, numa tabela só. A lente macro vs micro, e a conexão com a sua IA.",
    url: `${siteUrl}/alternativas`,
    type: "website",
  },
};

const MATRIX: ReadonlyArray<{ dim: string; sabor: string; by: Record<string, string> }> = [
  {
    dim: "O foco",
    sabor: "O quadro do mês",
    by: { mobills: "Cada transação", organizze: "Cada transação", planilha: "Linhas e fórmulas" },
  },
  {
    dim: "Esforço",
    sabor: "Mensal",
    by: { mobills: "Diário", organizze: "Diário", planilha: "Manual" },
  },
  {
    dim: "Conecta na sua IA",
    sabor: "Sim",
    by: { mobills: "Não", organizze: "Não", planilha: "Não" },
  },
  {
    dim: "Conexão com o banco",
    sabor: "Ainda não",
    by: { mobills: "Sim", organizze: "Sim", planilha: "Não" },
  },
  {
    dim: "Plano grátis",
    sabor: "Sim",
    by: { mobills: "Sim", organizze: "Não, só teste", planilha: "Sim" },
  },
];

const MATRIX_SLUGS = ["mobills", "organizze", "planilha"] as const;

export default function AlternativasHubPage() {
  const competitors = competitorSlugs()
    .map((s) => getCompetitor(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const matrixCompetitors = MATRIX_SLUGS.map((s) => getCompetitor(s)).filter(
    (x): x is NonNullable<typeof x> => Boolean(x),
  );

  return (
    <CalcShell width="wide" back={{ href: "/", label: "Início" }}>
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Comparações", url: "/alternativas" },
        ]}
      />

      <RevealOnScroll as="div" className="mb-8 max-w-2xl">
        <h1
          className="text-3xl font-extrabold text-[color:var(--text-primary)] sm:text-[2.5rem] sm:leading-[1.06]"
          style={{ letterSpacing: "-0.035em" }}
        >
          Qual app de finanças faz sentido pra você?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[color:var(--text-secondary)] sm:text-lg">
          A maioria te faz olhar cada transação. O Sabor te faz olhar o quadro do mês, o que você
          tem, o que deve e quanto ganha, e se está melhorando. Compare de perto.
        </p>
      </RevealOnScroll>

      <section className="mb-10">
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-xl">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[color:var(--border-soft)] text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
                <th className="px-4 py-3 font-bold" />
                <th className="bg-[color:var(--color-brand-500)]/[0.08] px-4 py-3 text-[color:var(--color-brand-700)]">
                  Sabor
                </th>
                {matrixCompetitors.map((c) => (
                  <th key={c.slug} className="px-4 py-3">
                    {c.competitorName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr
                  key={row.dim}
                  className="border-b border-[color:var(--border-soft)] text-[0.8125rem] last:border-0"
                >
                  <td className="px-4 py-3 font-semibold text-[color:var(--text-primary)]">
                    {row.dim}
                  </td>
                  <td className="bg-[color:var(--color-brand-500)]/[0.08] px-4 py-3 font-bold text-[color:var(--text-primary)]">
                    {row.sabor}
                  </td>
                  {matrixCompetitors.map((c) => (
                    <td key={c.slug} className="px-4 py-3 text-[color:var(--text-secondary)]">
                      {row.by[c.slug] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-brand-700)]">
          Compare de perto
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {competitors.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/alternativas/${c.slug}`}
                className="sf-lift focus-ring group flex h-full items-center justify-between gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
                style={{ boxShadow: "var(--shadow-glass-strong)" }}
              >
                <span
                  className="text-[0.9375rem] font-bold text-[color:var(--text-primary)]"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  Sabor vs {c.competitorName}
                </span>
                <ArrowUpRight
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                  className="text-[color:var(--text-muted)] transition-colors group-hover:text-[color:var(--color-brand-700)]"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="sf-lift relative overflow-hidden rounded-[1.5rem] border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] p-6 backdrop-blur-xl"
        style={{ boxShadow: "var(--shadow-glass-strong)" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[color:var(--color-brand-500)]/[0.14] blur-2xl"
        />
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-[color:var(--color-brand-700)]">
          <Sparkles size={13} strokeWidth={2} aria-hidden />
          O que ninguém mais tem
        </span>
        <h2
          className="mt-2 text-xl font-extrabold text-[color:var(--text-primary)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          Só o Sabor conversa com a sua IA
        </h2>
        <p className="mt-2 max-w-md text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          Conecte suas finanças no ChatGPT ou no Claude e pergunte com os seus números. Nenhum app
          de controle faz isso.
        </p>
        <Link
          href="/financas-com-ia"
          className="mt-3 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)]"
        >
          Veja como funciona
          <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
        </Link>
      </section>
    </CalcShell>
  );
}
