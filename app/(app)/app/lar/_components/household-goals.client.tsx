"use client";

import { Target } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Spinner } from "@/app/components/ui/spinner";
import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
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
      className="h-[9px] w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[color:var(--color-brand-500)] transition-[width]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface GoalCardProps {
  householdId: string;
  goal: SerializedHouseholdGoal;
}

function GoalCard({ householdId, goal }: GoalCardProps) {
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
    <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          {goal.title}
        </span>
        {goal.progressPct !== null ? (
          <span className="shrink-0 text-[0.875rem] font-bold tabular-nums text-[color:var(--text-primary)]">
            {Math.round(goal.progressPct)}%
          </span>
        ) : null}
      </div>

      {goal.progressPct !== null ? <ProgressBar pct={goal.progressPct} /> : null}

      <div className="text-[0.75rem] text-[color:var(--text-secondary)]">
        <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">
          <HideableValue>{goal.savedBrl}</HideableValue>
        </span>
        {goal.targetBrl ? (
          <>
            {" "}
            de{" "}
            <span className="tabular-nums">
              <HideableValue>{goal.targetBrl}</HideableValue>
            </span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Valor (R$)"
          aria-label={`Valor para guardar na meta ${goal.title}`}
          className="min-w-0 flex-1 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-1.5 text-[0.8125rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
        />
        <button
          type="button"
          onClick={handleContribute}
          disabled={pending}
          className="focus-ring flex shrink-0 items-center gap-1.5 rounded-lg bg-[color:var(--color-brand-800)] px-3 py-1.5 text-[0.8125rem] font-semibold text-white disabled:opacity-60 hover:opacity-90"
        >
          {pending ? <Spinner size={14} decorative className="text-white" /> : null}
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
    <div className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h3 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
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
        {pending ? <Spinner size={14} decorative className="text-white" /> : null}
        Criar meta
      </button>
    </div>
  );
}

export function HouseholdGoals({ householdId, goals }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {goals.length > 0 ? (
        goals.map((goal) => <GoalCard key={goal.id} householdId={householdId} goal={goal} />)
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Target size={22} strokeWidth={1.5} aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">
              Nenhuma meta ainda
            </h3>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Defina um objetivo que todos podem ajudar a construir.
            </p>
          </div>
        </section>
      )}

      <CreateGoalForm householdId={householdId} />
    </div>
  );
}
