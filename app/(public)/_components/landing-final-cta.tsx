import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { RevealOnScroll } from "./reveal-on-scroll";

export function LandingFinalCta() {
  return (
    <section className="relative py-20 sm:py-28">
      <RevealOnScroll className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 20%, rgba(242,142,37,0.22), rgba(242,142,37,0.05) 50%, transparent 75%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-[2rem] border border-[color:var(--border-soft)]"
            style={{
              background: "var(--surface-1)",
              backdropFilter: "blur(20px)",
            }}
          />

          <h2
            className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.05] text-[color:var(--text-primary)] sm:text-5xl lg:text-6xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            Banco mostra saldo hoje. Sabor mostra a saída.
          </h2>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/cadastrar"
              className="sf-lift focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-8 text-base font-bold text-white shadow-[0_16px_36px_-10px_rgba(239,122,26,0.55)] hover:shadow-[0_20px_44px_-10px_rgba(239,122,26,0.65)]"
            >
              Criar minha conta
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <Link
              href="/entrar"
              className="focus-ring inline-flex items-center justify-center rounded-full text-sm font-semibold text-[color:var(--text-secondary)] underline-offset-4 hover:text-[color:var(--text-primary)] hover:underline"
            >
              Já tenho conta
            </Link>
          </div>
          <p className="mt-6 text-xs text-[color:var(--text-muted)]">
            Plano gratuito pra sempre. Sem cartão de crédito.
          </p>
        </div>
      </RevealOnScroll>
    </section>
  );
}
