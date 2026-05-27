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
                Sabor mostra trajetória.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[color:var(--text-secondary)] sm:text-[18px]">
              Veja o tamanho real da sua dívida, quanto os juros realmente
              custam e o mês em que você sai do vermelho. Pra quem quer
              entender a trajetória, não anotar cada cafezinho.
            </p>

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
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-14 px-6 text-base"
              >
                <Link href="#como">Ver os 3 passos</Link>
              </Button>
            </div>

            <p className="mt-4 text-sm text-[color:var(--text-muted)]">
              Sem cartão de crédito. Sem pegadinha.
            </p>

            <div className="mt-10 hidden grid-cols-3 gap-5 border-t border-[color:var(--border-soft)] pt-6 lg:grid">
              <HeroStat
                value="4 tipos"
                body="Financiamento, empréstimo, cartão e cheque especial cobertos desde o dia 1."
              />
              <HeroStat
                value="5 simuladores"
                body="E se eu pagar mais? Em que ordem quito? Posso comprar isso? Tudo no Free."
              />
              <HeroStat
                value="1 minuto"
                body="Cadastrar renda e dívidas pra ver o primeiro diagnóstico. Sem cartão."
              />
            </div>
          </RevealOnScroll>

          <RevealOnScroll
            className="relative mt-10 lg:mt-0 lg:col-start-2 lg:row-start-1"
            threshold={0}
          >
            <LandingMockDashboard />
          </RevealOnScroll>

          <RevealOnScroll className="mt-12 lg:hidden" threshold={0}>
            <div className="grid grid-cols-1 gap-5 border-t border-[color:var(--border-soft)] pt-6 sm:grid-cols-3">
              <HeroStat
                value="4 tipos"
                body="Financiamento, empréstimo, cartão e cheque especial cobertos desde o dia 1."
              />
              <HeroStat
                value="5 simuladores"
                body="E se eu pagar mais? Em que ordem quito? Posso comprar isso? Tudo no Free."
              />
              <HeroStat
                value="1 minuto"
                body="Cadastrar renda e dívidas pra ver o primeiro diagnóstico. Sem cartão."
              />
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ value, body }: { value: string; body: string }) {
  return (
    <div>
      <p
        className="text-[26px] font-extrabold leading-none text-[color:var(--text-primary)]"
        style={{ letterSpacing: "-0.03em" }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-[color:var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}
