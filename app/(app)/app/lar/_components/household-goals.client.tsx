"use client";

import { Target } from "lucide-react";
import { useRef, useState, useTransition, type KeyboardEvent, type ChangeEvent } from "react";
import type { Route } from "next";
import Link from "next/link";

import { Spinner } from "@/app/components/ui/spinner";
import { formatCents } from "@/shared/format/money-format";
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

const MAX_CENTS = 999_999_999_99n;

const PT_BR_MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
] as const;

function etaLabel(etaMonths: number): string {
  const target = new Date();
  target.setMonth(target.getMonth() + etaMonths);
  const month = PT_BR_MONTHS[target.getMonth()]!;
  return `${month}/${target.getFullYear()}`;
}

function useBrlInput() {
  const [cents, setCents] = useState(0n);

  const display = cents === 0n ? "" : formatCents(cents);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.metaKey || e.ctrlKey) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      setCents((c) => c / 10n);
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      setCents(0n);
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const digit = BigInt(e.key);
      setCents((c) => {
        const next = c * 10n + digit;
        return next > MAX_CENTS ? c : next;
      });
      return;
    }
    if (["Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      return;
    }
    e.preventDefault();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    if (raw === "") {
      setCents(0n);
      return;
    }
    const next = BigInt(raw);
    if (next <= MAX_CENTS) setCents(next);
  }

  function reset() {
    setCents(0n);
  }

  return { cents, display, handleKeyDown, handleChange, reset };
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
  const brl = useBrlInput();

  function handleContribute() {
    if (brl.cents <= 0n) {
      setError("Informe um valor maior que zero.");
      return;
    }
    setError(null);
    const amountCents = brl.cents;
    startTransition(async () => {
      const result = await contributeHouseholdGoalAction({
        householdId,
        goalId: goal.id,
        amountCents,
      });
      if (!result.ok) {
        setError(result.message);
      } else {
        brl.reset();
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

      {goal.etaMonths !== null && goal.etaMonths > 0 ? (
        <p className="text-[0.75rem] text-[color:var(--text-muted)]">
          No ritmo atual, em{" "}
          <span className="font-medium text-[color:var(--text-secondary)]">
            {etaLabel(goal.etaMonths)}
          </span>
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="R$ 0,00"
          aria-label={`Valor para guardar na meta ${goal.title}`}
          value={brl.display}
          onKeyDown={brl.handleKeyDown}
          onChange={brl.handleChange}
          className="min-w-0 flex-1 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-1.5 text-[0.8125rem] tabular-nums text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
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
  const brl = useBrlInput();

  function handleCreate() {
    const label = labelRef.current?.value.trim() ?? "";
    if (!label) {
      setError("Dê um nome à meta.");
      return;
    }
    if (brl.cents <= 0n) {
      setError("Informe um valor alvo maior que zero.");
      return;
    }
    const targetCents = brl.cents;
    setError(null);
    startTransition(async () => {
      const result = await createHouseholdGoalAction({
        householdId,
        label,
        targetCents,
      });
      if (!result.ok) {
        setError(result.message);
      } else {
        if (labelRef.current) labelRef.current.value = "";
        brl.reset();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h3 className="text-[0.75rem] font-semibold text-[color:var(--text-muted)]">
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
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="R$ 0,00"
        aria-label="Valor alvo da meta do lar"
        value={brl.display}
        onKeyDown={brl.handleKeyDown}
        onChange={brl.handleChange}
        className="w-full rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-1.5 text-[0.8125rem] tabular-nums text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
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

interface FeaturedGoalProps {
  householdId: string;
  goal: SerializedHouseholdGoal;
}

export function HouseholdFeaturedGoal({ householdId, goal }: FeaturedGoalProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Target size={15} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            {goal.title}
          </span>
        </div>
        {goal.progressPct !== null ? (
          <span className="shrink-0 text-[0.875rem] font-bold tabular-nums text-[color:var(--color-brand-800)]">
            {Math.round(goal.progressPct)}%
          </span>
        ) : null}
      </div>

      {goal.progressPct !== null ? (
        <div
          className="h-[9px] w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]"
          role="progressbar"
          aria-valuenow={Math.round(goal.progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[color:var(--color-brand-500)] transition-[width]"
            style={{ width: `${Math.min(100, Math.max(0, goal.progressPct))}%` }}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[0.75rem] text-[color:var(--text-secondary)]">
            <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">
              <HideableValue>{goal.savedBrl}</HideableValue>
            </span>
            {goal.targetBrl ? (
              <>
                {" "}de{" "}
                <span className="tabular-nums">
                  <HideableValue>{goal.targetBrl}</HideableValue>
                </span>
              </>
            ) : null}
          </span>
          {goal.etaMonths !== null && goal.etaMonths > 0 ? (
            <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
              No ritmo atual, em{" "}
              <span className="font-medium">{etaLabel(goal.etaMonths)}</span>
            </span>
          ) : null}
        </div>
        <Link
          href={`/app/lar/metas` as Route}
          className="focus-ring shrink-0 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] hover:opacity-80"
        >
          Ver metas da casa
        </Link>
      </div>
    </section>
  );
}

interface NoGoalsTeaser {
  householdId: string;
}

export function HouseholdGoalsTeaser({ householdId: _ }: NoGoalsTeaser) {
  return (
    <section className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Target size={15} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="text-[0.8125rem] text-[color:var(--text-muted)]">
          Nenhuma meta definida ainda.
        </span>
      </div>
      <Link
        href={`/app/lar/metas` as Route}
        className="focus-ring shrink-0 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] hover:opacity-80"
      >
        Criar meta
      </Link>
    </section>
  );
}
