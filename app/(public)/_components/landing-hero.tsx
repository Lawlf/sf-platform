import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";

import { LandingMockDashboard } from "./landing-mock-dashboard";
import { RevealOnScroll } from "./reveal-on-scroll";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-24 lg:pt-20 lg:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8">
          <RevealOnScroll
            stagger
            className="relative z-10 lg:col-start-1 lg:row-start-1"
            threshold={0}
          >
            <h1
              className="mt-5 text-[40px] font-extrabold leading-[1.02] text-[color:var(--text-primary)] sm:text-[56px] lg:text-[64px]"
              style={{ letterSpacing: "-0.04em" }}
            >
              Banco mostra saldo.
              <br />
              <span className="text-[color:var(--color-brand-700)]">
                Sabor mostra seu avanço.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[color:var(--text-secondary)] sm:text-[18px]">
              Veja em que mês a dívida deve acabar se você seguir no ritmo de hoje,
              o tamanho real dela e quanto os juros custam de verdade. Sem anotar
              cada cafezinho.
            </p>

            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[color:var(--text-muted)]">
              Você atualiza seus números uma vez por mês. O resto é leitura.
            </p>

            <div className="mt-8 border-t border-[color:var(--border-soft)] pt-6">
              <HeroBeforeAfter />
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center lg:mt-8">
              <Button
                asChild
                variant="brand"
                size="lg"
                className="h-14 px-7 text-base sf-lift"
              >
                <Link href="/cadastrar" className="gap-2">
                  Começar grátis
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </Button>
              <Link
                href="#como"
                className="inline-flex items-center text-base font-medium text-[color:var(--text-secondary)] underline-offset-4 hover:text-[color:var(--text-primary)] hover:underline sm:px-2"
              >
                Ver os 3 passos
              </Link>
            </div>

            <p className="mt-4 text-sm text-[color:var(--text-muted)]">
              Grátis. Sem cartão de crédito.
            </p>
          </RevealOnScroll>

          <RevealOnScroll
            className="relative mt-10 lg:mt-0 lg:col-start-2 lg:row-start-1"
            threshold={0}
          >
            <LandingMockDashboard />
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function HeroBeforeAfter() {
  return (
    <div
      className="grid items-stretch overflow-hidden rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] backdrop-blur-xl"
      style={{ gridTemplateColumns: "1fr auto 1fr" }}
    >
      <div className="px-[18px] pb-5 pt-[18px]">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          Hoje
        </span>
        <p className="mt-2.5 text-[14px] leading-snug text-[color:var(--text-secondary)]">
          &ldquo;Sei quanto tenho na conta, mas não sei quanto devo somando
          tudo.&rdquo;
        </p>
        <svg
          viewBox="0 0 120 28"
          preserveAspectRatio="none"
          className="mt-3.5 block h-[26px] w-full"
          aria-hidden
        >
          <path
            d="M2 16 Q12 10 22 16 T42 16 T62 16 T82 16 T102 16 T118 14"
            fill="none"
            stroke="rgba(31,29,28,0.30)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 4"
          />
        </svg>
      </div>

      <div className="flex w-[46px] items-center justify-center bg-[color:var(--surface-3)]">
        <ArrowRight
          className="h-5 w-5 text-[color:var(--color-brand-600)]"
          strokeWidth={2.2}
          aria-hidden
        />
      </div>

      <div className="bg-[color:var(--bg-warm)] px-[18px] pb-5 pt-[18px]">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[color:var(--color-brand-700)]">
          Com o Sabor
        </span>
        <p className="mt-2.5 text-[14px] font-medium leading-snug text-[color:var(--text-primary)]">
          &ldquo;Vejo a dívida inteira num número só, encolhendo mês a
          mês.&rdquo;
        </p>
        <svg
          viewBox="0 0 120 28"
          preserveAspectRatio="none"
          className="mt-3.5 block h-[26px] w-full"
          aria-hidden
        >
          <path
            d="M2 24 C30 22 50 16 70 12 S104 4 118 3"
            fill="none"
            stroke="var(--semantic-positive)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="118" cy="3" r="2.6" fill="var(--semantic-positive)" />
        </svg>
      </div>
    </div>
  );
}
