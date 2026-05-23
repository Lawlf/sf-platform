import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { RevealOnScroll } from "./reveal-on-scroll";

export function LandingFounder() {
  return (
    <section className="relative py-12 sm:py-16">
      <RevealOnScroll className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-[1.75rem] p-8 sm:p-10 lg:p-12"
          style={{
            background:
              "linear-gradient(135deg, #2a2725 0%, #3a3633 60%, #1f1d1c 100%)",
            boxShadow:
              "0 30px 60px -20px rgba(31,29,28,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(242,142,37,0.35), transparent 70%)",
              filter: "blur(20px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(186,87,23,0.3), transparent 70%)",
              filter: "blur(20px)",
            }}
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-sm font-medium text-[color:var(--color-brand-300)]">
                Pra quem quer fechar a conversa de pagamento de uma vez:
              </p>
              <h2
                className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-[44px]"
                style={{ letterSpacing: "-0.035em" }}
              >
                <span className="text-[color:var(--color-brand-400)]">R$ 297</span> uma vez. Pro pra sempre, incluindo o que ainda nem lançamos.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
                100 vagas, pagamento único. Quando o preço subir (vai subir
                quando entrar ações da B3, comparativos avançados e o resto do
                roadmap), você não paga a diferença. Acabou as vagas, acabou a
                oferta.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <Link
                href={"/cadastrar?plan=founder" as never}
                className="sf-lift focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-brand-500)] px-7 py-4 text-base font-bold text-white shadow-[0_12px_30px_-8px_rgba(239,122,26,0.6)] hover:bg-[color:var(--color-brand-600)] hover:shadow-[0_18px_40px_-8px_rgba(239,122,26,0.7)]"
              >
                Garantir minha vaga
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <p className="max-w-xs text-xs leading-relaxed text-white/50 lg:text-right">
                100 vagas. R$ 297 uma vez. Pro pra sempre, inclui ações da B3
                quando entrar.
              </p>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
