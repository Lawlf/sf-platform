"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Crown, Lock, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Spinner } from "@/app/components/ui/spinner";

import {
  setLiquidBucketAction,
  updateGoalCascadeConfigAction,
} from "../../_actions/planning-actions";
import {
  fetchPlanningConfig,
  type PlanningGoalConfig,
} from "../../_actions/planning-queries";

const NO_BUCKET_VALUE = "__none__";

function clampPct(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-16 animate-pulse rounded-xl bg-[color:var(--surface-3)]" />
      <div className="h-24 animate-pulse rounded-xl bg-[color:var(--surface-3)]" />
    </div>
  );
}

export function CascadeConfigPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["planning", "config"],
    queryFn: fetchPlanningConfig,
  });

  if (isLoading || !data) return <PanelSkeleton />;

  return (
    <div className="flex flex-col gap-5">
      <BucketPicker
        cashAssets={data.cashAssets}
        liquidBucketAssetId={data.liquidBucketAssetId}
      />
      <CascadeEditor isPro={data.isPro} goals={data.goals} />
    </div>
  );
}

function BucketPicker({
  cashAssets,
  liquidBucketAssetId,
}: {
  cashAssets: { id: string; label: string }[];
  liquidBucketAssetId: string | null;
}) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (cashAssets.length === 0) {
    return (
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4">
        <div className="flex items-center gap-2">
          <Wallet
            size={15}
            strokeWidth={2}
            className="shrink-0 text-[color:var(--color-brand-800)]"
            aria-hidden
          />
          <span className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
            Onde seu saldo livre fica
          </span>
        </div>
        <p className="mt-1.5 text-[0.75rem] text-[color:var(--text-secondary)]">
          Cadastre uma reserva pra dizer onde seu dinheiro rende.{" "}
          <Link
            href={"/app/patrimonio/novo" as Route}
            className="focus-ring font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2"
          >
            Adicionar reserva
          </Link>
        </p>
      </div>
    );
  }

  function onChange(value: string) {
    const assetId = value === NO_BUCKET_VALUE ? null : value;
    setError(null);
    startTransition(async () => {
      const result = await setLiquidBucketAction(assetId);
      if (!result.ok) {
        setError(result.message ?? "Não foi possível salvar.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["planning", "config"] });
      await queryClient.invalidateQueries({ queryKey: ["planning", "projection"] });
    });
  }

  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4">
      <div className="flex items-center gap-2">
        <Wallet
          size={15}
          strokeWidth={2}
          className="shrink-0 text-[color:var(--color-brand-800)]"
          aria-hidden
        />
        <span className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
          Onde seu saldo livre fica
        </span>
        {pending ? <Spinner size={14} className="text-[color:var(--text-muted)]" /> : null}
      </div>
      <p className="mt-1 text-[0.75rem] text-[color:var(--text-secondary)]">
        Define o rendimento que a projeção usa pro que sobra cada mês.
      </p>
      <div className="mt-3">
        <Select
          value={liquidBucketAssetId ?? NO_BUCKET_VALUE}
          onValueChange={onChange}
          disabled={pending}
        >
          <SelectTrigger className="w-full" aria-label="Onde seu saldo livre fica">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_BUCKET_VALUE}>Ainda não defini</SelectItem>
            {cashAssets.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? (
        <p className="mt-2 text-[0.75rem] text-[color:#e0654f]">{error}</p>
      ) : null}
    </div>
  );
}

function CascadeEditor({
  isPro,
  goals,
}: {
  isPro: boolean;
  goals: PlanningGoalConfig[];
}) {
  if (!isPro) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Ordem das metas
          </h3>
          <Link
            href={"/app/configuracoes/planos" as Route}
            className="focus-ring inline-flex shrink-0 items-center gap-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2 hover:text-[color:var(--color-brand-700)]"
          >
            Se tornar Pro
            <Crown size={12} strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 opacity-60 backdrop-blur-xl">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-3)]">
            <Lock
              size={18}
              strokeWidth={1.75}
              className="text-[color:var(--text-muted)]"
              aria-hidden
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                Ajustar a fila de metas
              </span>
              <Lock
                size={12}
                strokeWidth={2.25}
                className="text-[color:var(--text-muted)]"
                aria-hidden
              />
            </div>
            <span className="mt-0.5 block text-[0.6875rem] text-[color:var(--text-muted)]">
              Reordene a prioridade e rode metas em paralelo no Pro.
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
          Ordem das metas
        </h3>
        <p className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-3 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Defina uma meta pra organizar a fila.{" "}
          <Link
            href={"/app/metas/nova" as Route}
            className="focus-ring font-semibold text-[color:var(--color-brand-800)] underline underline-offset-2"
          >
            Nova meta
          </Link>
        </p>
      </div>
    );
  }

  return <CascadeQueue goals={goals} />;
}

function CascadeQueue({ goals }: { goals: PlanningGoalConfig[] }) {
  const queryClient = useQueryClient();
  const [pendingGoalId, setPendingGoalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["planning", "config"] });
    await queryClient.invalidateQueries({ queryKey: ["planning", "projection"] });
  }

  function persist(
    goal: PlanningGoalConfig,
    patch: { mode: PlanningGoalConfig["mode"]; order: number; parallelFraction: number },
  ) {
    setError(null);
    setPendingGoalId(goal.goalId);
    startTransition(async () => {
      const result = await updateGoalCascadeConfigAction(goal.goalId, patch);
      if (!result.ok) {
        setError(result.message ?? "Não foi possível salvar.");
        setPendingGoalId(null);
        return;
      }
      await invalidate();
      setPendingGoalId(null);
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= goals.length) return;
    const a = goals[index]!;
    const b = goals[target]!;
    setError(null);
    setPendingGoalId(a.goalId);
    startTransition(async () => {
      const first = await updateGoalCascadeConfigAction(a.goalId, {
        mode: a.mode,
        order: b.order,
        parallelFraction: a.parallelPct / 100,
      });
      if (!first.ok) {
        setError(first.message ?? "Não foi possível salvar.");
        setPendingGoalId(null);
        return;
      }
      const second = await updateGoalCascadeConfigAction(b.goalId, {
        mode: b.mode,
        order: a.order,
        parallelFraction: b.parallelPct / 100,
      });
      if (!second.ok) {
        setError(second.message ?? "Não foi possível salvar.");
        setPendingGoalId(null);
        return;
      }
      await invalidate();
      setPendingGoalId(null);
    });
  }

  function toggleParallel(goal: PlanningGoalConfig, on: boolean) {
    persist(goal, {
      mode: on ? "parallel" : "queue",
      order: goal.order,
      parallelFraction: on ? Math.max(goal.parallelPct, 1) / 100 : goal.parallelPct / 100,
    });
  }

  function commitPct(goal: PlanningGoalConfig, raw: string) {
    const pct = clampPct(Number(raw));
    if (pct === goal.parallelPct) return;
    persist(goal, {
      mode: "parallel",
      order: goal.order,
      parallelFraction: pct / 100,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
        Ordem das metas
      </h3>
      <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
        A primeira da fila recebe o saldo livre primeiro. Em paralelo, ela divide uma fatia desde já.
      </p>
      <ul className="flex flex-col gap-2">
        {goals.map((goal, i) => {
          const rowPending = pendingGoalId === goal.goalId;
          const isParallel = goal.mode === "parallel";
          return (
            <li
              key={goal.goalId}
              className="flex flex-col gap-2.5 rounded-[12px] border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[0.75rem] font-bold text-[color:var(--color-brand-800)]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
                  {goal.title}
                </span>
                {rowPending ? (
                  <Spinner size={14} className="text-[color:var(--text-muted)]" />
                ) : null}
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || pendingGoalId !== null}
                    aria-label="Subir prioridade"
                    className="focus-ring flex h-7 w-7 items-center justify-center rounded-[8px] border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] disabled:opacity-40"
                  >
                    <ChevronUp size={14} strokeWidth={2.25} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === goals.length - 1 || pendingGoalId !== null}
                    aria-label="Descer prioridade"
                    className="focus-ring flex h-7 w-7 items-center justify-center rounded-[8px] border border-[color:var(--border-soft)] text-[color:var(--text-secondary)] disabled:opacity-40"
                  >
                    <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
                  </button>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pl-10">
                <label className="flex cursor-pointer items-center gap-2 text-[0.75rem] text-[color:var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={isParallel}
                    disabled={pendingGoalId !== null}
                    onChange={(e) => toggleParallel(goal, e.target.checked)}
                    className="h-4 w-4 rounded border-[color:var(--border-strong)] text-[color:var(--color-brand-500)] accent-[color:var(--color-brand-500)] disabled:opacity-40"
                  />
                  Rodar em paralelo
                </label>
                {isParallel ? (
                  <span className="flex items-center gap-1.5 text-[0.75rem] text-[color:var(--text-secondary)]">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={goal.parallelPct}
                      disabled={pendingGoalId !== null}
                      onBlur={(e) => commitPct(goal, e.target.value)}
                      aria-label={`Fatia em paralelo de ${goal.title}`}
                      className="focus-ring h-8 w-16 rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-2 text-right text-[0.8125rem] text-[color:var(--text-primary)] disabled:opacity-40"
                    />
                    <span>% do saldo livre</span>
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-1 text-[0.75rem] text-[color:#e0654f]">{error}</p>
      ) : null}
    </div>
  );
}
