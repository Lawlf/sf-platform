import { ArrowUpRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BreadcrumbJsonLd, FaqPageJsonLd } from "../../_components/json-ld";
import { RevealOnScroll } from "../../_components/reveal-on-scroll";
import { CalcShell } from "../../calculadora/_components/calc-shell";
import { GuiabolsoContrast } from "../_components/guiabolso-contrast";
import { OrganizzeContrast } from "../_components/organizze-contrast";
import { PlanilhaContrast } from "../_components/planilha-contrast";
import { WayContrast } from "../_components/way-contrast";
import { competitorSlugs, getCompetitor } from "../_lib/competitors";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";

export function generateStaticParams(): { slug: string }[] {
  return competitorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) return {};
  const path = `/alternativas/${c.slug}`;
  return {
    title: c.seoTitle,
    description: c.seoDescription,
    alternates: { canonical: path },
    openGraph: { title: c.seoTitle, description: c.seoDescription, url: `${siteUrl}${path}`, type: "website" },
  };
}

export default async function AlternativaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) notFound();

  const path = `/alternativas/${c.slug}`;
  const others = competitorSlugs()
    .filter((s) => s !== c.slug)
    .map((s) => getCompetitor(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <CalcShell back={{ href: "/alternativas", label: "Comparações" }}>
      <FaqPageJsonLd items={c.faq} />
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Comparações", url: "/alternativas" },
          { name: c.competitorName, url: path },
        ]}
      />

      <RevealOnScroll as="div" stagger className="flex flex-col gap-6">
        <header>
          <h1
            className="text-2xl font-extrabold text-[color:var(--text-primary)] sm:text-[2rem] sm:leading-[1.1]"
            style={{ letterSpacing: "-0.03em" }}
          >
            {c.h1}
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[color:var(--text-secondary)]">
            {c.answerBlock}
          </p>
        </header>

        {c.slug === "organizze" ? (
          <OrganizzeContrast />
        ) : c.slug === "planilha" ? (
          <PlanilhaContrast />
        ) : c.slug === "guiabolso" ? (
          <GuiabolsoContrast />
        ) : (
          <WayContrast />
        )}

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/entrar"
            className="sf-lift inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(239,122,26,0.6)]"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/precos"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--border-soft)] px-5 py-2.5 text-sm font-semibold text-[color:var(--text-primary)]"
          >
            Ver planos
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-xl">
          <div className="grid grid-cols-3 border-b border-[color:var(--border-soft)] px-4 py-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
            <span />
            <span>{c.competitorName}</span>
            <span>Sabor Financeiro</span>
          </div>
          {c.comparison.map((row) => (
            <div
              key={row.dimension}
              className="grid grid-cols-3 gap-2 border-b border-[color:var(--border-soft)] px-4 py-3 text-[0.8125rem] last:border-0"
            >
              <span className="font-semibold text-[color:var(--text-primary)]">{row.dimension}</span>
              <span className="text-[color:var(--text-secondary)]">{row.them}</span>
              <span className="text-[color:var(--text-primary)]">{row.us}</span>
            </div>
          ))}
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
            <h2 className="mb-2 text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              {c.whenCompetitorTitle ?? `Quando ${c.competitorName} faz mais sentido`}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {c.whenCompetitor.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[0.8125rem] text-[color:var(--text-secondary)]">
                  <Check size={15} strokeWidth={2.25} aria-hidden className="mt-0.5 shrink-0 text-[color:var(--text-muted)]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
            <h2 className="mb-2 text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              Quando o Sabor faz mais sentido
            </h2>
            <ul className="flex flex-col gap-1.5">
              {c.whenUs.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[0.8125rem] text-[color:var(--text-primary)]">
                  <Check size={15} strokeWidth={2.25} aria-hidden className="mt-0.5 shrink-0 text-[color:var(--color-brand-600)]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section>
          <h2 className="mb-3 text-base font-bold text-[color:var(--text-primary)]">Como começar</h2>
          <ol className="flex flex-col gap-2">
            {c.howToStart.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[0.8125rem] text-[color:var(--text-secondary)]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[0.75rem] font-bold text-[color:var(--color-brand-700)]">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold text-[color:var(--text-primary)]">Perguntas frequentes</h2>
          <dl className="flex flex-col gap-3">
            {c.faq.map((item) => (
              <div key={item.q} className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
                <dt className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">{item.q}</dt>
                <dd className="mt-1.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="sf-lift relative overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 backdrop-blur-xl" style={{ boxShadow: "var(--shadow-glass-strong)" }}>
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[color:var(--color-brand-500)]/[0.12] blur-2xl" />
          <h2 className="text-xl font-extrabold text-[color:var(--text-primary)]" style={{ letterSpacing: "-0.02em" }}>
            Experimente sem anotar cada gasto
          </h2>
          <p className="mt-2 max-w-md text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Crie uma conta grátis, coloque seus números e veja seu quadro do mês em poucos minutos.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href="/entrar" className="sf-lift inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(239,122,26,0.6)]">
              Criar conta grátis
            </Link>
            <Link href="/precos" className="inline-flex items-center justify-center rounded-full border border-[color:var(--border-soft)] px-5 py-2.5 text-sm font-semibold text-[color:var(--text-primary)]">
              Ver planos
            </Link>
          </div>
        </section>

        {others.length > 0 ? (
          <section>
            <h2 className="mb-3 text-base font-bold text-[color:var(--text-primary)]">
              Mais comparações
            </h2>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/alternativas/${o.slug}`}
                    className="sf-lift focus-ring group flex items-center justify-between gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 backdrop-blur-xl"
                  >
                    <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                      Sabor vs {o.competitorName}
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
        ) : null}
      </RevealOnScroll>
    </CalcShell>
  );
}
