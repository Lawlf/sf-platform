import { ChevronLeft } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Casca pública das calculadoras: herda a linguagem visual da landing (warm
 * gradient, blobs, grid de pontos, glass), header fixo com marca e acesso, link
 * de voltar opcional, e CTA honesto de criar conta. Sem promessa de resultado.
 */
export function CalcShell({
  children,
  back,
  width = "narrow",
}: {
  children: ReactNode;
  back?: { href: Route; label: string };
  width?: "narrow" | "wide";
}) {
  const max = width === "wide" ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-warm-gradient">
      <div aria-hidden className="bg-blob-top-right" />
      <div aria-hidden className="bg-blob-bottom-left" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-dots opacity-60"
      />

      <header className="sticky top-0 z-50 border-b border-[color:var(--border-soft)] bg-[color:var(--bg-app)]/70 backdrop-blur-md">
        <div className={`mx-auto flex h-16 w-full items-center justify-between gap-4 px-4 ${max}`}>
          <Link
            href="/"
            className="focus-ring flex items-center gap-2.5 rounded-full"
            aria-label="Sabor Financeiro"
          >
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-contain"
            />
            <span
              className="text-[15px] font-extrabold text-[color:var(--text-primary)]"
              style={{ letterSpacing: "-0.02em" }}
            >
              Sabor Financeiro
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/entrar"
              className="focus-ring hidden rounded-md font-medium text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)] sm:inline"
            >
              Entrar
            </Link>
            <Link
              href="/entrar"
              className="sf-lift focus-ring rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-2 font-semibold text-white shadow-[0_10px_26px_-10px_rgba(239,122,26,0.6)]"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main id="conteudo" className={`relative mx-auto w-full flex-1 px-4 py-6 sm:py-9 ${max}`}>
        {back ? (
          <Link
            href={back.href}
            className="focus-ring mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--color-brand-700)]"
          >
            <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
            {back.label}
          </Link>
        ) : null}
        {children}
      </main>

      <footer className="relative border-t border-[color:var(--border-soft)] bg-[color:var(--bg-app)]/40 backdrop-blur-sm">
        <div className={`mx-auto w-full px-4 py-8 ${max}`}>
          <p className="max-w-md text-[0.75rem] leading-relaxed text-[color:var(--text-secondary)]">
            Sabor Financeiro é um painel macro de patrimônio, dívida e renda. As calculadoras são
            gratuitas e não substituem orientação profissional.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.75rem] font-medium text-[color:var(--text-muted)]">
            <Link href="/" className="hover:text-[color:var(--color-brand-700)]">
              Início
            </Link>
            <Link href="/calculadora" className="hover:text-[color:var(--color-brand-700)]">
              Calculadoras
            </Link>
            <Link href="/precos" className="hover:text-[color:var(--color-brand-700)]">
              Planos
            </Link>
            <Link href="/privacidade" className="hover:text-[color:var(--color-brand-700)]">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-[color:var(--color-brand-700)]">
              Termos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Bloco de CTA reutilizável para o fim da página da calculadora. */
export function CalcAccountCta() {
  return (
    <section
      className="sf-lift relative mt-7 overflow-hidden rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 backdrop-blur-xl"
      style={{ boxShadow: "var(--shadow-glass-strong)" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[color:var(--color-brand-500)]/[0.12] blur-2xl"
      />
      <h2
        className="text-xl font-extrabold text-[color:var(--text-primary)]"
        style={{ letterSpacing: "-0.02em" }}
      >
        Acompanhe isso mês a mês
      </h2>
      <p className="mt-2 max-w-md text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        O Sabor Financeiro guarda seu patrimônio, suas dívidas e sua renda num painel só, atualizado
        a cada mês. Crie uma conta gratuita e transforme este cálculo num acompanhamento contínuo.
      </p>
      <Link
        href="/entrar"
        className="sf-lift mt-4 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(239,122,26,0.6)]"
      >
        Criar conta gratuita
      </Link>
    </section>
  );
}
