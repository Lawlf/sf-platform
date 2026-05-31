"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { RevealOnScroll } from "./reveal-on-scroll";

type Billing = "monthly" | "yearly";

const freeFeatures = [
  "Dívidas e renda ilimitadas",
  "Quanto da sua renda já está comprometido com dívidas",
  "Quanto os juros estão custando de verdade, somando tudo",
  "Seu patrimônio líquido atualizado a cada lançamento",
  "Simulador: e se eu pagar R$ X a mais por mês?",
  "Simulador: em que ordem quito pra economizar mais",
  "Simulador: posso comprar isso sem atrasar tudo?",
  "Linha do tempo do mês corrente",
  "Exportar CSV e PDF",
  "Lições básicas pra entender juros e parcelas",
];

const proFeatures = [
  "Tudo do Free",
  "Histórico completo da linha do tempo, todos os meses",
  "Comparar financiamentos lado a lado (parcela fixa, parcela decrescente, banco A vs B)",
  "Comparar ofertas de empréstimo",
  "Avisos de vencimento direto na central do app",
  "Acompanhe ações da B3 e criptomoedas: você diz o que tem, a gente puxa o preço e soma no patrimônio (com valorização e desvalorização automática)",
  "Avisos de preço e oportunidade dos seus ativos",
];

export function LandingPricing() {
  const [billing, setBilling] = useState<Billing>("yearly");
  const monthly = 19.9;
  const yearly = 199;
  const yearlyMonthlyEquivalent = yearly / 12;

  return (
    <section id="precos" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll className="mx-auto max-w-3xl text-center">
          <h2
            className="text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
            style={{ letterSpacing: "-0.035em" }}
          >
            <span className="mb-3 block text-2xl font-bold text-[color:var(--text-secondary)] sm:text-3xl">
              Grátis pra sempre.
            </span>
            R$ 19,90 só quando quiser histórico.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-[color:var(--text-secondary)] sm:text-lg">
            Se até aqui fez sentido, o resto da decisão é só preço.
          </p>

          <div
            className="mx-auto mt-8 inline-flex items-center rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-1 backdrop-blur-md"
            role="group"
            aria-label="Ciclo de cobrança"
          >
            <button
              type="button"
              aria-pressed={billing === "monthly"}
              aria-label="Cobrança mensal"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                billing === "monthly"
                  ? "bg-[color:var(--text-primary)] text-[color:var(--bg-app)]"
                  : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
              )}
            >
              Mensal
            </button>
            <button
              type="button"
              aria-pressed={billing === "yearly"}
              aria-label="Cobrança anual, 2 meses grátis"
              onClick={() => setBilling("yearly")}
              className={cn(
                "relative rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                billing === "yearly"
                  ? "bg-[color:var(--text-primary)] text-[color:var(--bg-app)]"
                  : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
              )}
            >
              Anual
              <span
                aria-hidden
                className="ml-2 rounded-full bg-[color:var(--color-positive)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-positive)]"
              >
                2 meses grátis
              </span>
            </button>
          </div>
        </RevealOnScroll>

        <RevealOnScroll stagger className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
          <PlanCard
            tone="free"
            name="Free"
            price="R$ 0"
            cadence="/sempre"
            description="Tudo essencial pra ver o tamanho do buraco e começar a sair dele."
            ctaLabel="Criar conta grátis"
            ctaHref="/cadastrar"
            ctaVariant="ghost"
            features={freeFeatures}
          />
          <PlanCard
            tone="pro"
            name="Pro"
            price={
              billing === "monthly"
                ? `R$ ${monthly.toFixed(2).replace(".", ",")}`
                : `R$ ${(yearly / 12).toFixed(2).replace(".", ",")}`
            }
            cadence="/mês"
            secondary={
              billing === "yearly"
                ? `Cobrado R$ ${yearly} no ano (equivale a R$ ${yearlyMonthlyEquivalent
                    .toFixed(2)
                    .replace(".", ",")} por mês)`
                : "Cobrado mensalmente. Cancele quando quiser."
            }
            description="Histórico completo, ações e criptomoedas no patrimônio, avisos no app, comparativos avançados."
            ctaLabel="Começar com o Pro"
            ctaHref={`/cadastrar?plan=pro&billing=${billing}` as Route}
            ctaVariant="brand"
            features={proFeatures}
          />
        </RevealOnScroll>

        <RevealOnScroll className="mt-10 flex flex-col items-center gap-4 text-center">
          <Link
            href="/precos"
            className="sf-lift focus-ring inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-1)] px-6 py-3 text-sm font-bold text-[color:var(--text-primary)] backdrop-blur-md"
          >
            Ver comparação detalhada de tudo
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </Link>
          <p className="text-sm text-[color:var(--text-muted)]">
            Sem fidelidade. Sem multa. Cancela e volta pro Free sempre que quiser.
          </p>
          <p className="max-w-md text-sm font-medium text-[color:var(--text-secondary)]">
            Educação financeira de verdade. A gente te mostra o caminho, não vende fórmula mágica
            nem dá palpite de ação.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

interface PlanCardProps {
  tone: "free" | "pro";
  name: string;
  price: string;
  cadence: string;
  secondary?: string;
  description: string;
  ctaLabel: string;
  ctaHref: Route;
  ctaVariant: "ghost" | "brand";
  features: string[];
}

function PlanCard({
  tone,
  name,
  price,
  cadence,
  secondary,
  description,
  ctaLabel,
  ctaHref,
  ctaVariant,
  features,
}: PlanCardProps) {
  const isPro = tone === "pro";

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[1.75rem] p-7 sm:p-8",
        isPro
          ? "border border-[color:var(--color-brand-500)]/40 bg-[color:var(--surface-1)] shadow-[0_30px_60px_-20px_rgba(239,122,26,0.35)]"
          : "border border-[color:var(--border-soft)] bg-[color:var(--surface-2)]",
      )}
      style={{
        backdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {isPro && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(242,142,37,0.28), transparent 70%)",
            filter: "blur(8px)",
          }}
        />
      )}

      <div className="relative z-10 flex items-center gap-2">
        <h3
          className="text-2xl font-extrabold text-[color:var(--text-primary)]"
          style={{ letterSpacing: "-0.03em" }}
        >
          {name}
        </h3>
        {isPro && (
          <Sparkles
            className="h-5 w-5 text-[color:var(--color-brand-600)]"
            strokeWidth={2.25}
            aria-hidden
          />
        )}
      </div>

      <p className="relative z-10 mt-3 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
        {description}
      </p>

      <div className="relative z-10" aria-live="polite">
        <div className="mt-6 flex items-baseline gap-1.5">
          <span
            key={price}
            className="sf-fade-swap text-5xl font-extrabold text-[color:var(--text-primary)] sm:text-6xl tabular-nums"
            style={{ letterSpacing: "-0.045em" }}
          >
            {price}
          </span>
          <span className="text-sm font-semibold text-[color:var(--text-muted)]">{cadence}</span>
        </div>
        {secondary && (
          <p
            key={secondary}
            className="sf-fade-swap mt-1.5 text-[13px] text-[color:var(--text-muted)]"
          >
            {secondary}
          </p>
        )}
      </div>

      <Link
        href={ctaHref}
        className={cn(
          "sf-lift focus-ring relative z-10 mt-7 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold",
          ctaVariant === "brand"
            ? "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_12px_30px_-8px_rgba(239,122,26,0.5)] hover:shadow-[0_18px_40px_-8px_rgba(239,122,26,0.6)]"
            : "border border-[color:var(--border-strong)] bg-[color:var(--surface-3)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-1)]",
        )}
      >
        {ctaLabel}
      </Link>

      <div className="relative z-10 mt-7 h-px bg-[color:var(--border-soft)]" />

      <ul className="relative z-10 mt-6 space-y-3">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-[14.5px] text-[color:var(--text-primary)]"
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                isPro
                  ? "bg-[color:var(--color-brand-500)] text-white"
                  : "bg-[color:var(--color-positive)]/15 text-[color:var(--color-positive)]",
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
