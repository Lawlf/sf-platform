import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { fetchPrescription } from "../_actions/prescription-queries";

import { moveCtaFor } from "./move-cta";
import { VerMais } from "./next-step-card.client";
import { presentMove } from "./prescription-copy";

const CARD_TITLE = "O movimento do mês";

interface StateTeaser {
  line1: string;
  line2: string;
  cta: string;
}

// Teaser borrado por estado (free): enquadra o movimento real sem revelar números.
const TEASER_BY_STATE: Record<string, StateTeaser> = {
  bleeding: {
    line1: "Coloque sua sobra na dívida certa primeiro.",
    line2: "Você economiza R$ ••• em juros e ••• meses.",
    cta: "Ver qual dívida quitar primeiro",
  },
  no_cushion: {
    line1: "Sua reserva ainda não cobre um imprevisto.",
    line2: "Faltam R$ ••• para o seu colchão ficar completo.",
    cta: "Ver quanto guardar por mês",
  },
  ready_to_grow: {
    line1: "Sua sobra pode render mais do que parada.",
    line2: "Em 12 meses, cerca de R$ •••.",
    cta: "Ver quanto sua sobra rende",
  },
  tight: {
    line1: "Dá para reequilibrar suas contas este mês.",
    line2: "Cortar cerca de R$ ••• por mês já resolve.",
    cta: "Ver o que ajustar este mês",
  },
};

const TEASER_FALLBACK: StateTeaser = {
  line1: "Tem um movimento certo para você este mês.",
  line2: "Veja o plano completo com seus números.",
  cta: "Ver meu movimento deste mês",
};

export async function NextStepCard() {
  const data = await fetchPrescription();
  if (!data) return null;

  // Estado 0: faltam dados; pedir o dado, não prescrever (guard-rail).
  if (!data.hasPlan) {
    const needsIncome = data.teaser.missing.includes("income");
    const needsRate = data.teaser.missing.includes("debt_rate");
    return (
      <section
        aria-label={CARD_TITLE}
        className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[18px] pb-[18px] pt-[14px] backdrop-blur-xl"
        style={{ boxShadow: "0 4px 16px -4px rgba(31,29,28,0.06)" }}
      >
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
          {CARD_TITLE}
        </h2>
        <p className="mt-2 text-[0.875rem] leading-[1.5] text-[color:var(--text-primary)]">
          {needsIncome
            ? "Falta sua renda. Com ela, a gente monta seu movimento do mês."
            : needsRate
              ? "Anota a taxa de juros das dívidas e a gente acha qual quitar primeiro."
              : "Registre sua renda e suas dívidas e a gente calcula seu movimento do mês."}
        </p>
      </section>
    );
  }

  // Free: teaser bloqueado por estado + CTA (parede de conversão).
  if (!data.isPro) {
    const teaser = TEASER_BY_STATE[data.state] ?? TEASER_FALLBACK;
    return (
      <section
        aria-label={CARD_TITLE}
        className="relative overflow-hidden rounded-[18px] border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
        style={{
          backgroundImage:
            "radial-gradient(circle at 100% 0%, rgba(242,142,37,0.16), transparent 60%)",
          boxShadow: "0 4px 16px -4px rgba(31,29,28,0.06)",
        }}
      >
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--color-brand-800)]">
          {CARD_TITLE}
        </h2>
        <p className="mt-1.5 text-[0.9375rem] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
          Tem um movimento certo para você este mês
        </p>
        <div className="mt-2 select-none blur-sm" aria-hidden="true">
          <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            {teaser.line1}
          </p>
          <p className="mt-0.5 text-[0.78125rem] text-[color:var(--text-secondary)]">
            {teaser.line2}
          </p>
        </div>
        <Link
          href={"/app/configuracoes/planos" as Route}
          className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[0.84375rem] font-bold text-white"
          style={{ boxShadow: "0 10px 24px -8px rgba(239,122,26,0.5)" }}
        >
          {teaser.cta}
          <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
        </Link>
        <p className="mt-3 text-[0.6875rem] text-[color:var(--text-muted)]">
          Isto é educação financeira, não recomendação de investimento.
        </p>
      </section>
    );
  }

  // Pro: ação dominante + ver mais.
  const p = data.prescription;
  if (!p || !p.dominant) return null;
  const dominant = presentMove(p.dominant);
  const more = p.alternatives.map(presentMove);

  return (
    <section
      aria-label={CARD_TITLE}
      className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[18px] pb-[18px] pt-[14px] backdrop-blur-xl"
      style={{ boxShadow: "0 4px 16px -4px rgba(31,29,28,0.06)" }}
    >
      <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
        {CARD_TITLE}
      </h2>
      <p className="mt-2 text-[1rem] font-bold leading-[1.35] tracking-[-0.01em] text-[color:var(--text-primary)]">
        {dominant.headline}
      </p>
      <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">{dominant.impact}</p>
      <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">{dominant.reason}</p>
      {(() => {
        const cta = moveCtaFor({ type: p.dominant.type, targetDebtId: p.dominant.targetDebtId ?? null });
        return cta ? (
          <Link
            href={cta.href as Route}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-brand-800)] hover:text-[color:var(--color-brand-700)] hover:underline"
          >
            {cta.label}
            <ArrowRight size={16} aria-hidden />
          </Link>
        ) : null;
      })()}
      <div className="mt-3">
        <VerMais items={more} />
      </div>
      <p className="mt-3 text-[0.6875rem] text-[color:var(--text-muted)]">
        Isto é educação financeira, não recomendação de investimento.
      </p>
    </section>
  );
}
