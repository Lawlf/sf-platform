"use client";

import { ArrowRight, Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { MaskMoneyText } from "../../_components/money-visibility/mask-money-text.client";
import type { IncomeFreeBalanceEvent } from "../_actions/create-income.action";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Row({ label, reais, strong }: { label: string; reais: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[0.8125rem] text-[color:var(--text-secondary)]">{label}</span>
      <span
        className={
          strong
            ? "text-[1.0625rem] font-bold text-[color:var(--text-primary)]"
            : "text-[0.9375rem] font-semibold text-[color:var(--text-primary)]"
        }
      >
        <MaskMoneyText text={BRL.format(reais)} />
      </span>
    </div>
  );
}

export function IncomeFreeBalanceResult({
  event,
  onDone,
}: {
  event: IncomeFreeBalanceEvent;
  onDone: () => void;
}) {
  const pro = event.isPro && event.jaTemDonoReais !== null && event.livreReais !== null;

  return (
    <section
      aria-label="Quanto é seu de verdade"
      className="relative overflow-hidden rounded-[18px] border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, rgba(242,142,37,0.16), transparent 60%)",
        boxShadow: "0 4px 16px -4px rgba(31,29,28,0.06)",
      }}
    >
      <h2 className="text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)]">
        Quanto é seu de verdade
      </h2>

      <div className="mt-3 flex flex-col gap-2">
        <Row label="Entrou agora" reais={event.entrouReais} />

        {pro ? (
          <>
            <Row label="Já tem dono" reais={event.jaTemDonoReais as number} />
            <div className="mt-1 border-t border-[color:var(--border-soft)] pt-2">
              <Row label="Livre pra usar, no total" reais={event.livreReais as number} strong />
              <p className="mt-1 text-[0.6875rem] leading-[1.4] text-[color:var(--text-muted)]">
                Inclui o que já estava livre, não só o que entrou agora.
              </p>
            </div>
          </>
        ) : (
          <div className="mt-1 border-t border-[color:var(--border-soft)] pt-3">
            <p className="flex items-center gap-1.5 text-[0.78125rem] font-medium text-[color:var(--color-brand-800)]">
              <Lock size={12} strokeWidth={2.25} aria-hidden />
              No Pro: quanto é seu de verdade
            </p>
            <p className="mt-2 text-[0.78125rem] leading-[1.5] text-[color:var(--text-secondary)]">
              No Pro você vê quanto já tem dono e quanto, no total, fica livre pra usar.
            </p>
          </div>
        )}
      </div>

      {pro ? (
        <button
          type="button"
          onClick={onDone}
          className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[color:var(--surface-2)] px-5 py-3 text-[0.84375rem] font-bold text-[color:var(--text-primary)]"
        >
          Concluir
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={"/app/configuracoes/planos" as Route}
            className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[0.84375rem] font-bold text-white"
            style={{ boxShadow: "0 10px 24px -8px rgba(239,122,26,0.5)" }}
          >
            Ver o plano Pro
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={onDone}
            className="focus-ring inline-flex w-full items-center justify-center rounded-[14px] px-5 py-2.5 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)]"
          >
            Concluir
          </button>
        </div>
      )}
    </section>
  );
}
