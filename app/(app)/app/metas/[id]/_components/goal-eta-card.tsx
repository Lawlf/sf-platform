import { Crown, Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { NextMoveAfterGoal } from "./next-move-after-goal.client";

function etaDateLabel(etaMonths: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + etaMonths);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

interface GoalEtaCardProps {
  goalId: string;
  etaLocked: boolean;
  etaMonths: number | null;
  reached: boolean;
}

export function GoalEtaCard({ goalId, etaLocked, etaMonths, reached }: GoalEtaCardProps) {
  if (reached) {
    return (
      <section className="rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] p-4 text-white shadow-[0_14px_32px_rgba(22,163,74,0.30)]">
        <div className="text-[1.625rem] font-extrabold leading-tight">Meta atingida</div>
        <p className="mt-2 text-[0.75rem] font-medium text-white/85">
          Parabéns! Você chegou ao alvo desta meta.
        </p>
        <div className="mt-3">
          <NextMoveAfterGoal />
        </div>
      </section>
    );
  }

  if (etaLocked) {
    return (
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--text-muted)]">
          Previsão
        </span>
        <div className="mt-1 flex items-center gap-2 text-[1.25rem] font-extrabold leading-tight text-[color:var(--text-primary)]">
          <Lock size={18} strokeWidth={2} className="text-[color:var(--text-muted)]" aria-hidden />
          <span className="blur-[5px] select-none" aria-hidden>
            set. de 2027
          </span>
        </div>
        <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
          No ritmo de hoje dá pra saber quando você chega lá. A data certa é do plano Pro.
        </p>
        <Link
          href={"/app/configuracoes/planos" as Route}
          className="focus-ring mt-3 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
        >
          Ver quando vou chegar
          <Crown size={12} strokeWidth={2.25} aria-hidden />
        </Link>
      </section>
    );
  }

  if (etaMonths === null) {
    return (
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--text-muted)]">
          Previsão
        </span>
        <div className="mt-1 text-[1.375rem] font-extrabold leading-tight text-[color:var(--text-primary)]">
          Sem previsão ainda
        </div>
        <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
          No ritmo atual, a meta não fecha num prazo que dá pra projetar. Aumente o quanto guarda por
          mês ou revise o alvo.
        </p>
        <Link
          href={`/app/metas/${goalId}/editar` as Route}
          className="focus-ring mt-3 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
        >
          Ajustar a meta
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_14px_32px_rgba(239,122,26,0.30)]">
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
        Previsão de conclusão
      </span>
      <div className="mt-1 text-[1.625rem] font-extrabold leading-tight">
        {etaDateLabel(etaMonths)}
      </div>
      <p className="mt-2 text-[0.75rem] font-medium text-white/85">
        Em {etaMonths} {etaMonths === 1 ? "mês" : "meses"} pelo ritmo atual.
      </p>
    </section>
  );
}
