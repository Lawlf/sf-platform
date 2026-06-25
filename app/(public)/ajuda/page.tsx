import { Mail } from "lucide-react";
import type { Metadata } from "next";

import { SOCIAL_LINKS } from "@/app/_shared/brand-social";

import { BreadcrumbJsonLd, FaqPageJsonLd } from "../_components/json-ld";
import { LandingFooter } from "../_components/landing-footer";
import { LandingHeader } from "../_components/landing-header";

import { HelpFaq } from "./_components/help-faq";
import { helpFaqItems } from "./_lib/help-faq-items";

const SUPPORT_EMAIL = "ajuda@saborfinanceiro.com.br";
const instagram = SOCIAL_LINKS.find((link) => link.label === "Instagram");

export const metadata: Metadata = {
  title: "Ajuda e suporte",
  description:
    "Central de ajuda do Sabor Financeiro: tire suas dúvidas sobre conta, Pro, privacidade e como o app funciona, ou fale com a equipe por email.",
  alternates: { canonical: "/ajuda" },
  openGraph: {
    title: "Ajuda e suporte do Sabor Financeiro",
    description:
      "Respostas pras dúvidas mais comuns e o canal pra falar com a equipe quando precisar de ajuda.",
    url: "/ajuda",
  },
};

export default function AjudaPage() {
  return (
    <div className="relative isolate min-h-screen bg-warm-gradient">
      <BreadcrumbJsonLd
        items={[
          { name: "Início", url: "/" },
          { name: "Ajuda", url: "/ajuda" },
        ]}
      />
      <FaqPageJsonLd items={helpFaqItems} id="ld-help-faq" />
      <div aria-hidden className="bg-blob-top-right" />
      <div aria-hidden className="bg-blob-bottom-left" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-dots opacity-60"
      />

      <LandingHeader />

      <main id="conteudo" className="relative pb-24 pt-12 sm:pt-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <header className="border-b border-[color:var(--border-soft)] pb-8">
            <h1
              className="text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
              style={{ letterSpacing: "-0.035em" }}
            >
              Precisa de ajuda?
            </h1>
            <p className="mt-4 text-base text-[color:var(--text-secondary)] sm:text-lg">
              Começa pela lista aqui embaixo, ela resolve a maioria dos casos. Se
              precisar falar com a gente, é só mandar um email. Quem responde é a
              equipe do Sabor, não um robô.
            </p>
          </header>

          <section
            aria-labelledby="contato-titulo"
            className="mt-10 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-6 backdrop-blur-md sm:p-8"
          >
            <h2
              id="contato-titulo"
              className="text-2xl font-extrabold tracking-[-0.02em] text-[color:var(--text-primary)]"
            >
              Falar com a equipe
            </h2>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-5 inline-flex items-center gap-3 rounded-full bg-[color:var(--color-brand-500)] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[color:var(--color-brand-700)]"
            >
              <Mail className="h-4 w-4" strokeWidth={2.5} />
              {SUPPORT_EMAIL}
            </a>
            <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
              A gente lê todos os emails e responde em 1 a 2 dias. No máximo 5 se
              cair fim de semana ou feriado. Manda o máximo de detalhe que der. Se
              for sobre algum número que ficou diferente do esperado, um print
              ajuda bastante.
            </p>
            {instagram ? (
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--text-muted)]">
                A gente também tá no{" "}
                <a
                  href={instagram.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[color:var(--color-brand-700)] hover:underline"
                >
                  Instagram (@saborfinanceiro)
                </a>
                , mas pra resolver coisa de conta o email é mais rápido, porque a
                gente acompanha tudo num lugar só.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="faq-titulo" className="mt-14">
            <h2
              id="faq-titulo"
              className="text-2xl font-extrabold tracking-[-0.02em] text-[color:var(--text-primary)] sm:text-3xl"
            >
              Perguntas frequentes
            </h2>
            <HelpFaq items={helpFaqItems} />
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
