import { Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BreadcrumbJsonLd, FaqPageJsonLd, SoftwareToolJsonLd } from "../../_components/json-ld";
import { RevealOnScroll } from "../../_components/reveal-on-scroll";
import { CalcAccountCta, CalcShell } from "../_components/calc-shell";
import { getPublicCalculator, publicCalculatorSlugs } from "../_lib/public-calculators";

import { CalcWidget } from "./_components/calc-widget.client";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";

export function generateStaticParams(): { slug: string }[] {
  return publicCalculatorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const calc = getPublicCalculator(slug);
  if (!calc) return {};
  const path = `/calculadora/${calc.slug}`;
  return {
    title: calc.seoTitle,
    description: calc.seoDescription,
    alternates: { canonical: path },
    openGraph: {
      title: calc.seoTitle,
      description: calc.seoDescription,
      url: `${siteUrl}${path}`,
      type: "website",
    },
  };
}

export default async function CalculadoraPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const calc = getPublicCalculator(slug);
  if (!calc) notFound();

  const path = `/calculadora/${calc.slug}`;

  return (
    <CalcShell back={{ href: "/calculadora", label: "Calculadoras" }}>
      <SoftwareToolJsonLd name={calc.h1} description={calc.seoDescription} path={path} />
      <FaqPageJsonLd items={calc.faq} />
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Calculadoras", url: "/calculadora" },
          { name: calc.h1, url: path },
        ]}
      />

      <RevealOnScroll as="div" stagger className="flex flex-col gap-5">
        <header>
          <h1
            className="text-2xl font-extrabold text-[color:var(--text-primary)] sm:text-[2rem] sm:leading-[1.1]"
            style={{ letterSpacing: "-0.03em" }}
          >
            {calc.h1}
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[color:var(--text-secondary)]">
            {calc.intro}
          </p>
        </header>

        <section className="flex items-start gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-700)]"
            aria-hidden
          >
            <Lightbulb size={18} strokeWidth={1.75} />
          </span>
          <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            {calc.howItWorks}
          </p>
        </section>

        <CalcWidget slug={calc.slug} />

        <section className="mt-2">
          <h2
            className="mb-4 text-lg font-extrabold text-[color:var(--text-primary)]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Perguntas frequentes
          </h2>
          <dl className="flex flex-col gap-3">
            {calc.faq.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
              >
                <dt className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                  {item.q}
                </dt>
                <dd className="mt-1.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <CalcAccountCta />
      </RevealOnScroll>
    </CalcShell>
  );
}
