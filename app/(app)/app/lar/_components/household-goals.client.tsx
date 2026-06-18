"use client";

import { Target } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Spinner } from "@/app/components/ui/spinner";
import {
  contributeHouseholdGoalAction,
  createHouseholdGoalAction,
} from "../../_actions/household-actions";
import type { SerializedHouseholdGoal } from "../../_actions/household-queries";

interface Props {
  householdId: string;
  goals: SerializedHouseholdGoal[];
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--border-soft)]"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[color:var(--color-brand-800)] transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface GoalRowProps {
  householdId: string;
  goal: SerializedHouseholdGoal;
}

function GoalRow({ householdId, goal }: GoalRowProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleContribute() {
    const raw = inputRef.current?.value ?? "";
    const parsed = parseFloat(raw.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    const cents = BigInt(Math.round(parsed * 100));
    setError(null);
    startTransition(async () => {
      const result = await contributeHouseholdGoalAction({
        householdId,
        goalId: goal.id,
        amountCents: cents,
      });
      if (!result.ok) {
        setError(result.message);
      } else {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
          {goal.title}
        </span>
        <span className="shrink-0 text-[0.75rem] tabular-nums text-[color:var(--text-muted)]">
          {goal.savedBrl}
          {goal.targetBrl ? ` / ${goal.targetBrl}` : null}
        </span>
      </div>

      {goal.progressPct !== null ? (
        <div className="flex items-center gap-2">
          <ProgressBar pct={goal.progressPct} />
          <span className="shrink-0 text-[0.6875rem] tabular-nums text-[color:var(--text-muted)]">
            {Math.round(goal.progressPct)}%
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Valor (R$)"
          aria-label={`Valor para guardar na meta ${goal.title}`}
          className="min-w-0 flex-1 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-1.5 text-[0.8125rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
        />
        <button
          type="button"
          onClick={handleContribute}
          disabled={pending}
          className="focus-ring flex shrink-0 items-center gap-1.5 rounded-lg bg-[color:var(--color-brand-800)] px-3 py-1.5 text-[0.8125rem] font-semibold text-white disabled:opacity-60 hover:opacity-90"
        >
          {pending ? (
            <Spinner size={14} decorative className="text-white" />
          ) : null}
          Guardar
        </button>
      </div>

      {error ? (
        <p className="text-[0.75rem] text-[color:var(--semantic-negative)]">{error}</p>
      ) : null}
    </div>
  );
}

interface CreateGoalFormProps {
  householdId: string;
}

function CreateGoalForm({ householdId }: CreateGoalFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);

  function handleCreate() {
    const label = labelRef.current?.value.trim() ?? "";
    if (!label) {
      setError("Dê um nome à meta.");
      return;
    }
    const raw = targetRef.current?.value ?? "";
    const parsed = parseFloat(raw.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      setError("Informe um valor alvo maior que zero.");
      return;
    }
    const cents = BigInt(Math.round(parsed * 100));
    setError(null);
    startTransition(async () => {
      const result = await createHouseholdGoalAction({
        householdId,
        label,
        targetCents: cents,
      });
      if (!result.ok) {
        setError(result.message);
      } else {
        if (labelRef.current) labelRef.current.value = "";
        if (targetRef.current) targetRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3">
      <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
        Nova meta
      </h3>
      <input
        ref={labelRef}
        type="text"
        maxLength={100}
        placeholder="Nome (ex.: casa própria)"
        aria-label="Nome da meta do lar"
        className="w-full rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-1.5 text-[0.8125rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
      />
      <input
        ref={targetRef}
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Valor alvo (R$)"
        aria-label="Valor alvo da meta do lar"
        className="w-full rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-1.5 text-[0.8125rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
      />
      {error ? (
        <p className="text-[0.75rem] text-[color:var(--semantic-negative)]">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={handleCreate}
        disabled={pending}
        className="focus-ring flex items-center justify-center gap-1.5 rounded-lg bg-[color:var(--color-brand-800)] px-4 py-2 text-[0.8125rem] font-semibold text-white disabled:opacity-60 hover:opacity-90"
      >
        {pending ? (
          <Spinner size={14} decorative className="text-white" />
        ) : null}
        Criar meta
      </button>
    </div>
  );
}

export function HouseholdGoals({ householdId, goals }: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Target size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[color:var(--text-primary)]">Metas da casa</h2>
          <span className="text-[0.75rem] text-[color:var(--text-muted)]">
            Objetivos que todos podem ajudar a construir
          </span>
        </div>
      </div>

      {goals.length > 0 ? (
        <div className="flex flex-col gap-2">
          {goals.map((goal) => (
            <GoalRow key={goal.id} householdId={householdId} goal={goal} />
          ))}
        </div>
      ) : (
        <p className="text-[0.875rem] text-[color:var(--text-muted)]">
          Nenhuma meta criada ainda. Defina um objetivo para a casa.
        </p>
      )}

      <CreateGoalForm householdId={householdId} />
    </section>
  );
}
