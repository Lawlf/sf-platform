import { ArrowUpRight, Calculator, LineChart, ShoppingBag, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BreadcrumbJsonLd, FaqPageJsonLd } from "../_components/json-ld";
import { RevealOnScroll } from "../_components/reveal-on-scroll";
import { CalcShell } from "../calculadora/_components/calc-shell";

import { AiChatDemo } from "./_components/ai-chat-demo";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.saborfinanceiro.com.br";
const path = "/financas-com-ia";

export const metadata: Metadata = {
  title: "Finanças com IA: converse com o ChatGPT ou o Claude sobre o seu dinheiro",
  description:
    "O Sabor Financeiro conecta as suas finanças na IA que você já usa. Pergunte ao ChatGPT ou ao Claude sobre dívidas, metas e patrimônio, com os seus números.",
  alternates: { canonical: path },
  openGraph: {
    title: "Finanças com IA: converse com a sua IA sobre o seu dinheiro",
    description:
      "Conecte as suas finanças no ChatGPT ou no Claude e pergunte com os seus números. Nenhum app de controle faz isso.",
    url: `${siteUrl}${path}`,
    type: "website",
  },
};

const USE_CASES = [
  { icon: Calculator, text: "Quanto falta pra quitar uma dívida?" },
  { icon: ShoppingBag, text: "Posso comprar isso agora?" },
  { icon: TrendingUp, text: "E se eu pagar mais por mês?" },
  { icon: LineChart, text: "Tô evoluindo no mês?" },
];

const STEPS = [
  "Crie a conta e coloque seus números.",
  "Conecte o Sabor no seu ChatGPT ou Claude.",
  "Pergunte. A IA responde com seus dados; pra mudar algo, ela propõe e você confirma.",
];

const FAQ = [
  {
    q: "O Sabor tem IA própria?",
    a: "Não. O Sabor conecta as suas finanças na IA que você já usa, como o ChatGPT e o Claude. Você fala com a sua IA, não com um robô nosso.",
  },
  {
    q: "Precisa saber programar?",
    a: "Não. Você adiciona o Sabor como uma conexão no seu ChatGPT ou Claude e autoriza o acesso. Leva poucos minutos.",
  },
  {
    q: "A IA mexe nos meus dados sem permissão?",
    a: "Não. A leitura é com a sua autorização, e qualquer mudança, como criar uma meta, a IA propõe e você confirma antes.",
  },
  {
    q: "Funciona no ChatGPT e no Claude?",
    a: "Sim, e em qualquer aplicativo que suporte MCP.",
  },
  {
    q: "É grátis?",
    a: "Tem um plano grátis. Há também planos pagos com mais recursos.",
  },
];

export default function FinancasComIaPage() {
  return (
    <CalcShell back={{ href: "/", label: "Início" }}>
      <FaqPageJsonLd items={FAQ} />
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Finanças com IA", url: path },
        ]}
      />

      <RevealOnScroll as="div" stagger className="flex flex-col gap-7">
        <header>
          <h1
            className="text-2xl font-extrabold text-[color:var(--text-primary)] sm:text-[2.25rem] sm:leading-[1.08]"
            style={{ letterSpacing: "-0.03em" }}
          >
            Converse com a sua IA sobre o seu dinheiro
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[color:var(--text-secondary)]">
            Você não precisa decidir sozinho. O Sabor liga as suas finanças na IA que você já usa, o
            ChatGPT ou o Claude, e ela responde com os seus números. O Sabor não tem IA própria: a
            inteligência é a sua, a gente só dá os dados certos pra ela.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
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
        </header>

        <AiChatDemo />

        <section>
          <h2 className="mb-3 text-base font-bold text-[color:var(--text-primary)]">
            O que dá pra perguntar
          </h2>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <li
                key={u.text}
                className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3.5 backdrop-blur-xl"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-700)]"
                  aria-hidden
                >
                  <u.icon size={18} strokeWidth={1.75} />
                </span>
                <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  {u.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold text-[color:var(--text-primary)]">Como funciona</h2>
          <ol className="flex flex-col gap-2.5">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[0.875rem] text-[color:var(--text-secondary)]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[0.75rem] font-bold text-[color:var(--color-brand-700)]">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <h2 className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            Nenhum app de controle faz isso
          </h2>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Mobills, Organizze e os outros não conectam na sua IA. Veja a diferença de perto.
          </p>
          <Link
            href="/alternativas/mobills"
            className="mt-2 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)]"
          >
            Sabor vs Mobills
            <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
          </Link>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold text-[color:var(--text-primary)]">
            Já usa ChatGPT ou Claude?
          </h2>
          <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Conectar leva poucos minutos: você adiciona o Sabor como conexão (MCP) e autoriza o
            acesso aos seus dados. Não precisa programar. Se ainda não usa IA, comece pelo app e
            conecte quando quiser.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold text-[color:var(--text-primary)]">
            Perguntas frequentes
          </h2>
          <dl className="flex flex-col gap-3">
            {FAQ.map((item) => (
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

        <section
          className="sf-lift relative overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-glass-strong)" }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[color:var(--color-brand-500)]/[0.12] blur-2xl"
          />
          <h2 className="text-xl font-extrabold text-[color:var(--text-primary)]" style={{ letterSpacing: "-0.02em" }}>
            Comece de graça
          </h2>
          <p className="mt-2 max-w-md text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
            Crie sua conta, coloque seus números e, quando quiser, conecte na sua IA.
          </p>
          <Link
            href="/entrar"
            className="sf-lift mt-4 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(239,122,26,0.6)]"
          >
            Criar conta grátis
          </Link>
        </section>
      </RevealOnScroll>
    </CalcShell>
  );
}
