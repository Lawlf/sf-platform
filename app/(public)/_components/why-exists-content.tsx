import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { RevealOnScroll } from "./reveal-on-scroll";

const principles = [
  {
    title: "O mês inteiro, não o centavo.",
    body: "A gente mostra o retrato do mês: renda, dívida, patrimônio numa tela. Caçar cada gasto fica pra quem gosta.",
  },
  {
    title: "A gente calcula, você decide.",
    body: "O número e a conta são nossos. A escolha do que fazer com eles é sempre sua. A gente nunca te empurra.",
  },
  {
    title: "Feito pra renda que oscila.",
    body: "Mês cheio, mês magro, freela que cai sem avisar. A gente trabalha com a sua realidade, não com um salário fixo que você não tem.",
  },
  {
    title: "Você nunca vira planilheiro.",
    body: "Se usar a gente virar uma segunda profissão, a gente falhou. Pouco esforço, na sua cadência, sem cobrança diária.",
  },
];

const col = "mx-auto max-w-2xl px-6";
const colWide = "mx-auto max-w-3xl px-6";
const eyebrow =
  "text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-700)]";
const prose =
  "flex flex-col gap-5 text-base leading-relaxed text-[color:var(--text-secondary)] sm:text-lg";

interface WhyExistsCta {
  href: string;
  label: string;
  note?: string;
}

export function WhyExistsContent({ cta }: { cta: WhyExistsCta }) {
  return (
    <>
      <section className="relative pt-16 pb-10 sm:pt-24 sm:pb-12">
        <RevealOnScroll className={col}>
          <p className={eyebrow}>No que a gente acredita</p>
          <h1
            className="mt-4 text-5xl font-extrabold text-[color:var(--text-primary)] sm:text-6xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            O problema nunca foi sua disciplina.
          </h1>
          <p className="mt-6 text-lg text-[color:var(--text-secondary)] sm:text-xl">
            Sua renda muda todo mês. Nenhum app de dinheiro foi feito pensando
            nisso.
          </p>
        </RevealOnScroll>
      </section>

      <section className="relative py-10">
        <RevealOnScroll className={col}>
          <div className={prose}>
            <p>
              Você já tentou. Baixou o app que todo mundo recomenda, anotou cada
              café, cada Uber, cada mercado. No terceiro dia, parou. Não foi
              preguiça. É que anotar centavo não responde a pergunta que tira seu
              sono: o mês que vem fecha?
            </p>
            <p>
              Porque sua renda não é uma linha reta. Um mês entra bem, no outro o
              cliente atrasa, no seguinte vem um trabalho extra que você não
              esperava. E no meio disso tudo tem a parcela que não muda, a conta
              que vence dia 10, a fatura correndo. Você sente o aperto antes de
              conseguir medir o tamanho dele. Aí decide no escuro.
            </p>
          </div>
        </RevealOnScroll>
      </section>

      <section className="relative py-10">
        <RevealOnScroll className={col}>
          <p className={eyebrow}>Por que a gente existe</p>
          <div className={`mt-6 ${prose}`}>
            <p>
              A gente criou o Sabor Financeiro pra responder uma pergunta só:
              como está o mês inteiro do seu dinheiro, agora?
            </p>
            <p>
              Você abre uma tela e vê o que importa junto: quanto entra, quanto
              sai, quanto você deve, quanto já construiu. A gente faz a conta. A
              decisão continua sendo sua, porque é o seu dinheiro e o seu mês.
            </p>
          </div>
        </RevealOnScroll>
      </section>

      <section className="relative py-10 sm:py-14">
        <RevealOnScroll className={colWide}>
          <p className={eyebrow}>As nossas regras</p>
          <h2
            className="mt-3 text-3xl font-extrabold text-[color:var(--text-primary)] sm:text-4xl"
            style={{ letterSpacing: "-0.035em" }}
          >
            Quatro linhas que a gente não cruza.
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {principles.map((principle) => (
              <li
                key={principle.title}
                className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 backdrop-blur-xl"
              >
                <h3 className="text-lg font-extrabold text-[color:var(--text-primary)]">
                  {principle.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[color:var(--text-secondary)]">
                  {principle.body}
                </p>
              </li>
            ))}
          </ul>
        </RevealOnScroll>
      </section>

      <section className="relative py-10">
        <RevealOnScroll className={col}>
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-6 sm:p-8">
            <p className={eyebrow}>Sinceridade</p>
            <h2 className="mt-3 text-2xl font-extrabold text-[color:var(--text-primary)] sm:text-3xl">
              Talvez não seja pra você.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[color:var(--text-secondary)]">
              Se você ama uma planilha caprichada e quer registrar cada
              transação, categoria por categoria, tem ferramentas melhores que a
              gente pra isso. O Sabor Financeiro é pra quem quer ver o mês inteiro
              sem virar contador de si mesmo. Tudo bem se não for o seu caso.
            </p>
          </div>
        </RevealOnScroll>
      </section>

      <section className="relative pt-10 pb-24 sm:pt-14 sm:pb-32">
        <RevealOnScroll className={col}>
          <h2
            className="text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
            style={{ letterSpacing: "-0.035em" }}
          >
            Você não precisa de mais disciplina. Precisa de uma foto que faça
            sentido.
          </h2>
          <p className="mt-6 text-lg text-[color:var(--text-secondary)]">
            O mês inteiro do seu dinheiro numa tela. O resto do mês é seu.
          </p>
          <Link
            href={cta.href as Route}
            className="sf-lift focus-ring mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-brand-500)] px-7 py-4 text-base font-bold text-white shadow-[0_12px_30px_-8px_rgba(239,122,26,0.6)] hover:bg-[color:var(--color-brand-600)]"
          >
            {cta.label}
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </Link>
          {cta.note ? (
            <p className="mt-3 text-sm text-[color:var(--text-muted)]">{cta.note}</p>
          ) : null}
        </RevealOnScroll>
      </section>
    </>
  );
}
