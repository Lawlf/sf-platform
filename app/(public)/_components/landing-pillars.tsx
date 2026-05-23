import { Coins, TrendingUp, Wallet } from "lucide-react";

import { RevealOnScroll } from "./reveal-on-scroll";

const pillars = [
  {
    icon: Coins,
    name: "Patrimônio",
    promise: "O que você tem.",
    body: "Carro, casa, investimentos, eletrônicos, móveis caros, presente que valeu dinheiro. Tudo soma. Tudo deprecia ou cresce com o tempo, sem você precisar abrir planilha.",
    color: "var(--color-positive)",
  },
  {
    icon: Wallet,
    name: "Dívidas",
    promise: "O que você deve.",
    body: "Financiamento, cartão, cheque especial, empréstimo, crediário do Magalu. Com o custo real dos juros somando tudo, não a taxa que o banco anunciou.",
    color: "var(--color-negative)",
  },
  {
    icon: TrendingUp,
    name: "Renda",
    promise: "O que entra no mês.",
    body: "Salário, freela, aluguel recebido, comissão, bônus, 13º, restituição. Recorrente, pontual ou variável. A gente entende que o brasileiro raramente tem só salário.",
    color: "var(--color-brand-700)",
  },
];

export function LandingPillars() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll className="mx-auto max-w-3xl text-center">
          <h2
            className="text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
            style={{ letterSpacing: "-0.035em" }}
          >
            Três coisas. Uma tela.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[color:var(--text-secondary)] sm:text-lg">
            Patrimônio, dívidas e renda lançados juntos. Você vê o sistema
            inteiro funcionando, não pedaços soltos em três apps diferentes.
          </p>
        </RevealOnScroll>

        <RevealOnScroll stagger className="mt-14 grid gap-4 sm:gap-6 md:grid-cols-3">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <article
                key={p.name}
                className="sf-lift relative overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-7 backdrop-blur-xl sm:p-8"
                style={{ boxShadow: "var(--shadow-glass-strong)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: p.color }}
                  >
                    {p.promise}
                  </span>
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    aria-hidden
                    style={{ color: p.color }}
                  />
                </div>
                <h3
                  className="mt-3 text-[40px] font-extrabold leading-none text-[color:var(--text-primary)] sm:text-[44px]"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {p.name}
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
                  {p.body}
                </p>
              </article>
            );
          })}
        </RevealOnScroll>

        <RevealOnScroll className="mx-auto mt-10 max-w-2xl text-center">
          <p className="text-[15px] font-medium text-[color:var(--text-primary)] sm:text-base">
            <span className="font-extrabold">Resultado em uma linha:</span>{" "}
            <span className="text-[color:var(--text-secondary)]">
              o quanto sobra de verdade, mês a mês. E pra onde sua trajetória
              está indo.
            </span>
          </p>
          <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-1.5 text-[12px] font-medium text-[color:var(--text-secondary)] backdrop-blur">
            <span aria-hidden className="h-1 w-1 rounded-full bg-[color:var(--color-brand-500)]" />
            Uma vez por mês. Cinco minutos. A gente faz o resto.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
