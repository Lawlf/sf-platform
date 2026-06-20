import {
  ArrowRight,
  Calculator,
  LineChart as LineChartIcon,
  type LucideIcon,
  TrendingDown,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

import { RevealOnScroll } from "./reveal-on-scroll";

interface Feature {
  icon: LucideIcon;
  n: string;
  label: string;
  title: string;
  body: string;
  accent: string;
}

const heroFeature: Feature = {
  icon: TrendingDown,
  n: "01",
  label: "Projeção de quitação.",
  title: "A data prevista pra dívida acabar.",
  body: "Mantendo o ritmo atual, o sistema projeta em que mês cada dívida sai e quando abre espaço pra guardar. Aumente o aporte e veja as datas se aproximarem.",
  accent: "from-[#16a34a] to-[#0f7a37]",
};

const features: Feature[] = [
  {
    icon: Calculator,
    n: "02",
    label: "O custo real dos juros.",
    title: "O custo real, não a taxa do anúncio.",
    body: "Juntamos os juros de todas as suas dívidas num custo só, o Custo Efetivo Total. Você vê o número que o banco prefere esconder.",
    accent: "from-[#f28e25] to-[#ef7a1a]",
  },
  {
    icon: Zap,
    n: "03",
    label: "Simuladores.",
    title: "E se eu pagar R$ 200 a mais por mês?",
    body: "Em que ordem quito as dívidas pra economizar mais juros? Em quanto tempo elas devem acabar? Posso comprar essa parcela sem atrasar tudo? A gente faz a conta em segundos, lado a lado.",
    accent: "from-[#ca8a04] to-[#a16207]",
  },
  {
    icon: LineChartIcon,
    n: "04",
    label: "Patrimônio invisível.",
    title: "Carro, casa, móveis caros: tudo conta na trajetória.",
    body: "Banco só vê o que está em conta. A gente soma o que você comprou, o que valoriza e o que deprecia. Sua trajetória de verdade, não a do extrato.",
    accent: "from-[#ef7a1a] to-[#8d4112]",
  },
];

export function LandingFeatures() {
  const HeroIcon = heroFeature.icon;
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

        <RevealOnScroll className="mt-14">
          <article
            className="sf-lift group relative overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 backdrop-blur-xl sm:p-8"
            style={{ boxShadow: "var(--shadow-glass-strong)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60"
              style={{
                background: `linear-gradient(135deg, var(--color-brand-300), var(--color-brand-500))`,
              }}
            />

            <div className="relative z-10 grid gap-6 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="flex items-start justify-between">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${heroFeature.accent} text-white shadow-lg`}
                  >
                    <HeroIcon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <span
                    className="font-mono text-xs font-bold text-[color:var(--text-muted)]"
                    aria-hidden
                  >
                    {heroFeature.n}
                  </span>
                </div>
                <p className="mt-6 text-[15px] font-bold text-[color:var(--text-primary)]">
                  {heroFeature.label}
                </p>
                <h3
                  className="mt-1 text-[26px] font-extrabold leading-tight text-[color:var(--text-primary)] sm:text-3xl"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {heroFeature.title}
                </h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
                  {heroFeature.body}
                </p>
              </div>
              <TimelineMock />
            </div>
          </article>
        </RevealOnScroll>

        <RevealOnScroll stagger className="mt-4 grid gap-4 sm:mt-5 sm:gap-5 md:grid-cols-3">
          {features.map((feature) => {
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
                    {feature.n}
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

function TimelineMock() {
  return (
    <div className="relative z-10 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--bg-warm)] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
        Exemplo de plano de saída
      </p>
      <ul className="mt-3 space-y-2.5">
        <PlanStep
          color="var(--color-negative)"
          label="Cartão Nubank"
          month="sai em mar/2027"
        />
        <PlanStep
          color="var(--color-warning)"
          label="Financiamento do carro"
          month="sai em ago/2028"
        />
        <PlanStep
          color="var(--color-positive)"
          label="Abre espaço pra guardar"
          month="set/2028"
          highlight
        />
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-[color:var(--text-muted)]">
        Exemplo ilustrativo. Atualizou a renda do mês? O plano recalcula no ritmo
        novo.
      </p>
    </div>
  );
}

function PlanStep({
  color,
  label,
  month,
  highlight,
}: {
  color: string;
  label: string;
  month: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
        <span className="truncate text-[13px] font-medium text-[color:var(--text-primary)]">
          {label}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
          highlight
            ? "bg-[color:var(--color-positive)]/12 text-[color:var(--color-positive)]"
            : "bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]",
        )}
      >
        {month}
      </span>
    </li>
  );
}
