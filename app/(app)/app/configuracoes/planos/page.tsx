import { ArrowRight, Crown, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { PlanComparison } from "@/app/(public)/_components/plan-comparison";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

export const metadata: Metadata = { title: "Plano" };

export default async function ConfiguracoesPlanosPage() {
  const user = await requireUser();
  const isPro = user.isPro;

  return (
    <PageShell
      title="Plano"
      description="Seu plano atual e o que muda no Pro."
      backHref={"/app/configuracoes" as Route}
    >
      <section
        className={
          isPro
            ? "rounded-2xl border border-[color:var(--color-brand-500)]/40 bg-[linear-gradient(135deg,rgba(242,142,37,0.10),rgba(239,122,26,0.04))] p-5 backdrop-blur-xl"
            : "rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
                Seu plano
              </span>
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-2 py-0.5 text-[10px] font-bold text-white">
                  <Crown size={10} strokeWidth={2.5} aria-hidden />
                  Pro
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-[color:var(--surface-3)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--text-secondary)]">
                  Free
                </span>
              )}
            </div>
            <h2
              className="mt-1 text-[22px] font-extrabold text-[color:var(--text-primary)]"
              style={{ letterSpacing: "-0.02em" }}
            >
              {isPro ? "Pro" : "Free"}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
              {isPro
                ? "Você tem acesso a tudo: histórico completo, ações B3, criptos e avisos."
                : "Você tem o essencial pra ver o tamanho do buraco e decidir o que fazer."}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[22px] font-extrabold text-[color:var(--text-primary)] tabular-nums"
              style={{ letterSpacing: "-0.03em" }}
            >
              {isPro ? "R$ 14,90" : "R$ 0"}
            </p>
            <p className="text-[10px] text-[color:var(--text-muted)]">
              {isPro ? "por mês" : "pra sempre"}
            </p>
          </div>
        </div>

        {isPro ? (
          <p className="mt-4 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2.5 text-[12px] text-[color:var(--text-secondary)]">
            Gerenciamento da assinatura em breve. Por enquanto, fale com o suporte se quiser cancelar
            ou trocar de período.
          </p>
        ) : (
          <Link
            href={"/precos" as Route}
            className="sf-lift focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(239,122,26,0.5)]"
          >
            <Sparkles size={16} strokeWidth={2} aria-hidden />
            Fazer upgrade pro Pro
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Compare os planos
          </h2>
          {!isPro ? (
            <span className="text-[11px] text-[color:var(--text-muted)]">
              Sem fidelidade, sem multa.
            </span>
          ) : null}
        </div>
        <PlanComparison />
      </section>
    </PageShell>
  );
}
