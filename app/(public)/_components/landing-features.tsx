import {
  ArrowRight,
  Calculator,
  LineChart as LineChartIcon,
  TrendingDown,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";

import { RevealOnScroll } from "./reveal-on-scroll";

const features = [
  {
    icon: Calculator,
    label: "CET ponderado.",
    title: "O custo real, não a taxa do anúncio.",
    body: "Calculamos o Custo Efetivo Total ponderado entre todas as suas dívidas. Você vê o número que o banco prefere esconder.",
    accent: "from-[#f28e25] to-[#ef7a1a]",
  },
  {
    icon: TrendingDown,
    label: "Projeção de quitação.",
    title: "A data prevista pra dívida acabar.",
    body: "Mantendo o ritmo atual, o sistema projeta o mês de quitação total. Aumente o aporte e veja a data se aproximar em tempo real.",
    accent: "from-[#16a34a] to-[#0f7a37]",
  },
  {
    icon: Zap,
    label: "Simuladores.",
    title: "E se eu pagar R$ 200 a mais por mês?",
    body: "Em que ordem quito as dívidas pra economizar mais juros? Em quanto tempo elas devem acabar? Posso comprar essa parcela sem atrasar tudo? A gente faz a conta em segundos, lado a lado.",
    accent: "from-[#ca8a04] to-[#a16207]",
  },
  {
    icon: LineChartIcon,
    label: "Patrimônio invisível.",
    title: "Carro, casa, móveis caros: tudo conta na trajetória.",
    body: "Banco só vê o que está em conta. A gente soma o que você comprou, o que valoriza e o que deprecia. Sua trajetória de verdade, não a do extrato.",
    accent: "from-[#ef7a1a] to-[#8d4112]",
  },
];

export function LandingFeatures() {
  return (
    <section id="produto" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll className="mx-auto max-w-3xl text-center">
          <h2
            className="text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
            style={{ letterSpacing: "-0.035em" }}
          >
            Quatro coisas que viram saldo em trajetória.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-[color:var(--text-secondary)] sm:text-lg">
            Pilares pensados pro brasileiro que sangra em juros compostos e não
            enxerga o tamanho do buraco.
          </p>
        </RevealOnScroll>

        <RevealOnScroll stagger className="mt-14 grid gap-4 sm:gap-5 md:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="sf-lift group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 backdrop-blur-xl sm:p-8"
                style={{
                  boxShadow: "var(--shadow-glass-strong)",
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, var(--color-brand-300), var(--color-brand-500))`,
                  }}
                />

                <div className="relative z-10 flex items-start justify-between">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white shadow-lg`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <span
                    className="font-mono text-xs font-bold text-[color:var(--text-muted)]"
                    aria-hidden
                  >
                    0{index + 1}
                  </span>
                </div>

                <p className="relative z-10 mt-6 text-[15px] font-bold text-[color:var(--text-primary)]">
                  {feature.label}
                </p>
                <h3
                  className="relative z-10 mt-1 text-[22px] font-extrabold leading-tight text-[color:var(--text-primary)] sm:text-2xl"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  {feature.title}
                </h3>
                <p className="relative z-10 mt-3 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
                  {feature.body}
                </p>
              </article>
            );
          })}
        </RevealOnScroll>

        <RevealOnScroll className="mt-14 flex flex-col items-center text-center">
          <p className="max-w-md text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
            Já fez sentido? A primeira tela leva 1 minuto. Tem mais até o final
            da página, mas você não precisa esperar.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              variant="brand"
              size="lg"
              className="h-12 px-6 text-sm sf-lift"
            >
              <Link href="/cadastrar" className="gap-2">
                Começar grátis
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </Button>
            <Link
              href="#precos"
              className="focus-ring text-sm font-semibold text-[color:var(--text-secondary)] underline-offset-4 hover:text-[color:var(--text-primary)] hover:underline"
            >
              Ou pular pro preço
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
