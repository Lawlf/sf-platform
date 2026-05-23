import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd } from "../_components/json-ld";
import { LandingFooter } from "../_components/landing-footer";
import { LandingHeader } from "../_components/landing-header";
import { PlanComparison } from "../_components/plan-comparison";

export const metadata: Metadata = {
  title: "Preços",
  description:
    "Veja tudo que o Free e o Pro do Sabor Financeiro entregam, lado a lado. Sem letra miúda, sem fidelidade, sem multa.",
  alternates: { canonical: "/precos" },
  keywords: [
    "preço Sabor Financeiro",
    "plano gratuito controle financeiro",
    "plano pro patrimônio",
    "comparação de planos",
  ],
  openGraph: {
    title: "Preços",
    description:
      "Free com tudo essencial. Pro para histórico completo, ações B3, criptos e avisos.",
    url: "/precos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Preços",
    description: "Free com tudo essencial. Pro para quem quer mais.",
    images: [
      {
        url: "/precos/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Sabor Financeiro - Compare Free e Pro",
      },
    ],
  },
};

export default function PrecosPage() {
  return (
    <div className="relative isolate min-h-screen bg-warm-gradient">
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Preços", url: "/precos" },
        ]}
      />
      <div aria-hidden className="bg-blob-top-right" />
      <div aria-hidden className="bg-blob-bottom-left" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-dots opacity-60"
      />

      <LandingHeader />

      <main className="relative pb-24 pt-12 sm:pt-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/#precos"
            className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            Voltar
          </Link>

          <header className="mt-8">
            <h1
              className="text-[42px] font-extrabold leading-[1.02] text-[color:var(--text-primary)] sm:text-[56px]"
              style={{ letterSpacing: "-0.04em" }}
            >
              Tudo que está dentro,
              <br />
              <span className="text-[color:var(--color-brand-700)]">
                lado a lado.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[color:var(--text-secondary)] sm:text-[18px]">
              O Free entrega o essencial pra você ver o tamanho do buraco e
              decidir o que fazer. O Pro adiciona histórico, comparações
              avançadas, investimentos e avisos. Compare item por item antes
              de assinar.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <PlanSummary
                tone="free"
                name="Free"
                price="R$ 0"
                cadence="pra sempre"
                ctaLabel="Criar conta grátis"
                ctaHref="/cadastrar"
              />
              <PlanSummary
                tone="pro"
                name="Pro"
                price="R$ 14,90"
                cadence="por mês, ou R$ 119 no ano"
                ctaLabel="Começar com o Pro"
                ctaHref="/cadastrar?plan=pro"
              />
            </div>
          </header>

          <div className="mt-14">
            <PlanComparison />
          </div>

          <section className="mt-16 rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-8 backdrop-blur-md sm:p-10">
            <h2
              className="text-2xl font-extrabold text-[color:var(--text-primary)] sm:text-3xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              Pronto pra começar?
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
              Comece no Free, suba pro Pro quando fizer sentido. Sem fidelidade,
              sem multa, cancela quando quiser.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastrar"
                className="sf-lift focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-6 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(239,122,26,0.5)]"
              >
                Criar conta grátis
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </Link>
              <Link
                href="/entrar"
                className="focus-ring inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              >
                Já tenho conta
              </Link>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

function PlanSummary({
  tone,
  name,
  price,
  cadence,
  ctaLabel,
  ctaHref,
}: {
  tone: "free" | "pro";
  name: string;
  price: string;
  cadence: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  const isPro = tone === "pro";
  return (
    <div
      className={
        isPro
          ? "rounded-2xl border border-[color:var(--color-brand-500)]/40 bg-[color:var(--surface-1)] p-5 backdrop-blur-md"
          : "rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-5 backdrop-blur-md"
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          className="text-lg font-extrabold text-[color:var(--text-primary)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {name}
        </h2>
        <div className="text-right">
          <p
            className="text-2xl font-extrabold text-[color:var(--text-primary)] tabular-nums"
            style={{ letterSpacing: "-0.03em" }}
          >
            {price}
          </p>
          <p className="text-[11px] text-[color:var(--text-muted)]">{cadence}</p>
        </div>
      </div>
      <Link
        href={ctaHref as never}
        className={
          isPro
            ? "sf-lift focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-8px_rgba(239,122,26,0.5)]"
            : "sf-lift focus-ring mt-4 inline-flex w-full items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-3)] px-5 py-3 text-sm font-bold text-[color:var(--text-primary)]"
        }
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
