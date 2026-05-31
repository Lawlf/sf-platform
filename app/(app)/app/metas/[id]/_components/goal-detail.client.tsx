"use client";

import { Archive, Crown, Lock, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";

import { HowItWorksSheet } from "../../../_components/how-it-works-sheet";
import type { HowItWorksTopic } from "../../../_components/how-it-works-sheet";
import { ResultCard, ResultStat } from "../../../simular/_components/sim-result";
import { archiveGoalAction, deleteGoalAction } from "../../_actions/goal-actions";
import type { SerializedGoalDetail } from "../../_actions/goal-queries";

import { GoalEvolutionChart } from "./goal-evolution-chart";

interface GoalDetailProps {
  detail: SerializedGoalDetail;
}

function brl(cents: string | number): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function etaDateLabel(etaMonths: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + etaMonths);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

const TOPIC_BY_TYPE: Record<string, HowItWorksTopic> = {
  debt_payoff: "meta-quitar",
  emergency_fund: "meta-reserva",
  savings: "meta-juntar",
  financial_independence: "meta-independencia",
};

export function GoalDetail({ detail }: GoalDetailProps) {
  const { goal, progress, etaLocked, snapshots } = detail;
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currentCents = Number(progress.currentCents);
  const targetCents = Number(progress.targetCents);
  const remainingCents = Math.max(0, targetCents - currentCents);
  const pct = Math.min(100, Math.max(0, progress.pct));

  const howItWorksTopic: HowItWorksTopic | undefined = TOPIC_BY_TYPE[goal.type];

  async function handleArchive() {
    setArchiving(true);
    const result = await archiveGoalAction(goal.id);
    setArchiving(false);
    if (result.ok) {
      router.push("/app/metas" as Route);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteGoalAction(goal.id);
    setDeleting(false);
    if (result.ok) {
      router.push("/app/metas" as Route);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ETA hero */}
      <EtaHero etaLocked={etaLocked} etaMonths={progress.etaMonths} reached={progress.reached} />

      {/* Progress card */}
      <ResultCard title="Progresso">
        <div className="flex items-baseline gap-2">
          <span className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
            {pct.toFixed(0)}%
          </span>
          <span className="text-[0.75rem] text-[color:var(--text-muted)]">concluído</span>
        </div>
        <div className="h-[9px] w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]">
          <div
            className={`h-full rounded-full transition-[width] ${progress.reached ? "bg-[color:var(--semantic-positive)]" : "bg-[color:var(--color-brand-500)]"}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <ResultStat label="Já juntou/pagou" value={brl(progress.currentCents)} />
        <ResultStat label="Alvo total" value={brl(progress.targetCents)} />
        {!progress.reached && <ResultStat label="Falta" value={brl(String(remainingCents))} />}
        {goal.type === "emergency_fund" && goal.monthlyCostCents === null && (
          <p className="mt-1 text-[0.7rem] text-[color:var(--text-muted)]">
            Reserva estimada com base em ~75% da sua renda mensal.
          </p>
        )}
      </ResultCard>

      {/* Evolution chart */}
      <ResultCard title="Evolução" subtitle="Saldo mensal registrado">
        <GoalEvolutionChart snapshots={snapshots} />
      </ResultCard>

      {/* How it works */}
      {howItWorksTopic ? (
        <div className="flex justify-start">
          <HowItWorksSheet topic={howItWorksTopic} variant="brand" />
        </div>
      ) : null}

      {/* Actions: secundárias e discretas, padrão size sm ghost */}
      <div className="flex items-center justify-end gap-1 border-t border-[color:var(--border-soft)] pt-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="gap-1.5" disabled={archiving}>
              <Archive size={14} strokeWidth={2} aria-hidden />
              Arquivar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar meta?</AlertDialogTitle>
              <AlertDialogDescription>
                A meta será arquivada e deixará de aparecer na lista principal. Você pode reativá-la depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-[color:var(--color-brand-500)] hover:brightness-110 focus-visible:ring-[color:var(--color-brand-500)]"
                onClick={handleArchive}
              >
                Arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-[color:var(--semantic-negative)] hover:text-[color:var(--semantic-negative)]"
              disabled={deleting}
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden />
              Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os dados de progresso e histórico desta meta
                serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function EtaHero({
  etaLocked,
  etaMonths,
  reached,
}: {
  etaLocked: boolean;
  etaMonths: number | null;
  reached: boolean;
}) {
  if (reached) {
    return (
      <section className="rounded-2xl bg-[linear-gradient(135deg,#16a34a,#22c55e)] p-4 text-white shadow-[0_14px_32px_rgba(22,163,74,0.30)]">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
          Situação
        </span>
        <div className="mt-1 text-[1.625rem] font-extrabold leading-tight">Meta atingida</div>
        <p className="mt-2 text-[0.75rem] font-medium text-white/85">
          Parabéns! Você chegou ao alvo desta meta.
        </p>
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
          Projeção no Pro
        </div>
        <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
          Veja a data prevista de conclusão desta meta no plano Pro.
        </p>
        <Link
          href={"/app/configuracoes/planos" as Route}
          className="focus-ring mt-3 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
        >
          Se tornar Pro
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
          Fora do horizonte
        </div>
        <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
          Com os números atuais, o alvo não é atingido num horizonte projetável. Aumente o aporte ou
          revise o alvo.
        </p>
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
