import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PRESCRIPTION_CONFIG } from "@/domain/config/prescription-config";

import { getPrescription } from "../_lib/prescription-cache";

import { MaskMoneyText } from "./money-visibility/mask-money-text.client";
import { moveCtaFor } from "./move-cta";
import { VerMais } from "./next-step-card.client";
import { ESTIMATED_INCOME_NOTE, microEduFor, presentMove, presentTimeline, tightKindOf, type TightKind } from "./prescription-copy";

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
};

const TEASER_FALLBACK: StateTeaser = {
  line1: "Tem um movimento certo para você este mês.",
  line2: "Veja o plano completo com seus números.",
  cta: "Ver meu movimento deste mês",
};

const TEASER_BY_TIGHT_KIND: Record<TightKind, StateTeaser> = {
  deficit: {
    line1: "Este mês sai mais do que entra.",
    line2: "Faltam R$ ••• pra fechar o mês.",
    cta: "Ver minhas parcelas",
  },
  over_committed: {
    line1: "Suas parcelas sozinhas já passam a renda.",
    line2: "Cortar R$ ••• por mês deixa a renda cobrir as parcelas.",
    cta: "Ver qual parcela renegociar",
  },
  squeezed: {
    line1: "Você fecha o mês, mas no limite.",
    line2: "Sobram só R$ ••• neste mês.",
    cta: "Ver o que ajustar este mês",
  },
};

export async function NextStepCard() {
  const data = await getPrescription();
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
        <h2 className="text-[0.8125rem] font-semibold text-[color:var(--text-secondary)]">
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

  // Free: resposta concreta liberada (qual movimento/dívida) + ação. Só os
  // números (economia, meses) ficam borrados como prévia do Pro.
  if (!data.isPro) {
    const teaser =
      data.state === "tight"
        ? TEASER_BY_TIGHT_KIND[
            tightKindOf({ committedPct: data.committedPct, freeBalanceReais: data.freeBalanceReais })
          ]
        : (TEASER_BY_STATE[data.state] ?? TEASER_FALLBACK);
    const fm = data.freeMove;
    // Linha concreta, não borrada: nomeia a dívida quando há label.
    const answer = fm?.targetDebtLabel
      ? `Comece pela dívida: ${fm.targetDebtLabel}.`
      : teaser.line1;
    const action = fm ? moveCtaFor({ type: fm.type, targetDebtId: fm.targetDebtId }) : null;
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
        <h2 className="text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)]">
          {CARD_TITLE}
        </h2>
        <p className="mt-1.5 text-[0.9375rem] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
          {answer}
        </p>
        <div className="mt-1 select-none blur-sm" aria-hidden="true">
          <p className="text-[0.78125rem] text-[color:var(--text-secondary)]">{teaser.line2}</p>
        </div>
        {data.timelineTeaser ? (
          <p className="mt-2 text-[0.78125rem] leading-[1.5] text-[color:var(--text-secondary)]">
            <span aria-hidden className="select-none blur-sm">Mês •••</span>{" "}
            essa dívida quita e a sobra muda de lugar.
          </p>
        ) : null}
        {action ? (
          <Link
            href={action.href as Route}
            className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[0.84375rem] font-bold text-white"
            style={{ boxShadow: "0 10px 24px -8px rgba(239,122,26,0.5)" }}
          >
            {action.label}
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </Link>
        ) : (
          <Link
            href={"/app/configuracoes/planos" as Route}
            className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[0.84375rem] font-bold text-white"
            style={{ boxShadow: "0 10px 24px -8px rgba(239,122,26,0.5)" }}
          >
            {teaser.cta}
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </Link>
        )}
        <p className="mt-3 text-[0.6875rem] text-[color:var(--text-muted)]">
          {data.hasEstimatedIncome ? ESTIMATED_INCOME_NOTE : "A gente mostra a conta, a decisão é sua."}
        </p>
      </section>
    );
  }

  // Pro: ação dominante + ver mais.
  const p = data.prescription;
  if (!p || !p.dominant) return null;
  const ctx = { committedPct: p.committedPct, freeBalanceReais: p.freeBalanceReais };
  const dominant = presentMove(p.dominant, ctx);
  const more = p.alternatives.map((mv) => presentMove(mv, ctx));

  return (
    <section
      aria-label={CARD_TITLE}
      className="rounded-[18px] border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[18px] pb-[18px] pt-[14px] backdrop-blur-xl"
      style={{ boxShadow: "0 4px 16px -4px rgba(31,29,28,0.06)" }}
    >
      <h2 className="text-[0.8125rem] font-semibold text-[color:var(--text-secondary)]">
        {CARD_TITLE}
      </h2>
      <p className="mt-2 text-[1rem] font-bold leading-[1.35] tracking-[-0.01em] text-[color:var(--text-primary)]">
        <MaskMoneyText text={dominant.headline} />
      </p>
      <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
        <MaskMoneyText text={dominant.impact} />
      </p>
      <p className="mt-0.5 text-[0.6875rem] leading-[1.5] text-[color:var(--text-muted)]">
        {dominant.reason}
        {p.dominant.metrics.rateEstimated && p.dominant.targetDebtId ? (
          <>
            {" "}
            <Link
              href={`/app/dividas/${p.dominant.targetDebtId}/editar` as Route}
              className="font-medium text-[color:var(--text-secondary)] underline underline-offset-2 hover:text-[color:var(--text-primary)]"
            >
              Confere na fatura pra cravar o número.
            </Link>
          </>
        ) : null}
      </p>
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
      <div className="mt-4">
        <VerMais
          items={more}
          microEdu={microEduFor(p.dominant.type)}
          timeline={presentTimeline(p.timeline, PRESCRIPTION_CONFIG.timelineHorizonMonths)}
        />
      </div>
      <p className="mt-3 text-[0.6875rem] text-[color:var(--text-muted)]">
        {p.hasEstimatedIncome
          ? ESTIMATED_INCOME_NOTE
          : p.dominant.type === "invest"
            ? "Isto é educação financeira, não recomendação de investimento."
            : "A gente mostra a conta, a decisão é sua."}
      </p>
    </section>
  );
}
