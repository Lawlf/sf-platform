import { AlertTriangle, CheckCircle, LogIn, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LandingFooter } from "../_components/landing-footer";
import { LandingHeader } from "../_components/landing-header";

const SUPPORT_EMAIL = "ajuda@saborfinanceiro.com.br";

export const metadata: Metadata = {
  title: "Excluir conta",
  description: "Como excluir sua conta e todos os dados do Sabor Financeiro.",
  alternates: { canonical: "/excluir-conta" },
  robots: { index: false },
};

export default function ExcluirContaPage() {
  return (
    <div className="relative isolate min-h-screen bg-warm-gradient">
      <div aria-hidden className="bg-blob-top-right" />
      <div aria-hidden className="bg-blob-bottom-left" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-dots opacity-60"
      />

      <LandingHeader />

      <main id="conteudo" className="relative pb-24 pt-12 sm:pt-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <header className="border-b border-[color:var(--border-soft)] pb-8">
            <h1
              className="text-4xl font-extrabold text-[color:var(--text-primary)] sm:text-5xl"
              style={{ letterSpacing: "-0.035em" }}
            >
              Excluir conta
            </h1>
            <p className="mt-4 text-[1.0625rem] text-[color:var(--text-secondary)]">
              Você pode excluir sua conta e todos os seus dados a qualquer momento, diretamente
              no app.
            </p>
          </header>

          <div className="mt-10 flex flex-col gap-8">
            <section>
              <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
                O que é excluído
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {[
                  "Conta de acesso (email e autenticação)",
                  "Todos os perfis, rendas, dívidas e patrimônio",
                  "Metas, simulações e histórico",
                  "Assinaturas e dados de pagamento",
                  "Todos os arquivos e notas anexados",
                  "Preferências, configurações e integrações",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle
                      size={18}
                      strokeWidth={2}
                      className="mt-0.5 flex-none text-[color:var(--semantic-positive)]"
                      aria-hidden
                    />
                    <span className="text-[0.9375rem] text-[color:var(--text-secondary)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--semantic-negative)]/20 bg-[color:var(--semantic-negative)]/[0.06] p-4">
              <AlertTriangle
                size={18}
                strokeWidth={2}
                className="mt-0.5 flex-none text-[color:var(--semantic-negative)]"
                aria-hidden
              />
              <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
                A exclusão é permanente e imediata. Não tem como recuperar os dados depois.
              </p>
            </div>

            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
                Como excluir
              </h2>
              <p className="text-[0.9375rem] text-[color:var(--text-secondary)]">
                Entre na sua conta e acesse{" "}
                <strong className="font-semibold text-[color:var(--text-primary)]">
                  Configurações &rsaquo; Dados pessoais &rsaquo; Excluir conta
                </strong>
                . Digite seu email para confirmar e clique em &ldquo;Excluir permanentemente&rdquo;.
              </p>
              <Link
                href="/entrar?next=/app/perfil/conta"
                className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl bg-[color:var(--color-brand-500)] px-5 py-3 text-[0.9375rem] font-bold text-white transition-opacity hover:opacity-90"
              >
                <LogIn size={16} strokeWidth={2} aria-hidden />
                Entrar para excluir minha conta
              </Link>
            </section>

            <section className="border-t border-[color:var(--border-soft)] pt-8">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
                Prefere pedir por email?
              </h2>
              <p className="mt-2 text-[0.9375rem] text-[color:var(--text-secondary)]">
                Se não conseguir acessar sua conta, entre em contato e a gente exclui manualmente
                em até 5 dias úteis.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20conta`}
                className="focus-ring mt-4 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
              >
                <Mail size={16} strokeWidth={2} aria-hidden />
                {SUPPORT_EMAIL}
              </a>
            </section>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
