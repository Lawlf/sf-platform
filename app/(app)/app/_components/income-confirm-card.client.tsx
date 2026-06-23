"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { settleIncomeAction } from "../_actions/planning-actions";
import type { SerializedIncomeRow } from "../_actions/timeline-month-detail";
import { queryKeys } from "../_lib/query-keys";

import { HideableValue } from "./money-visibility/hideable-value.client";

interface Props {
  incomes: SerializedIncomeRow[];
  monthIso: string;
}

/**
 * Confirmação de entrada no MEIO do mês (não só no fechar-mês): pra renda
 * variável já vencida e ainda não confirmada, "Recebi" / "Não veio" grava o
 * settlement e o piso garantido do herói sobe na hora. É o gancho de retorno
 * dentro do mês pro freela de renda irregular.
 */
export function IncomeConfirmCard({ incomes, monthIso }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().slice(0, 10);
  const toConfirm = useMemo(
    () =>
      incomes.filter(
        (i) =>
          i.isEstimated &&
          i.settledStatus === null &&
          i.dateIso.slice(0, 10) <= today &&
          !settledIds.has(i.id),
      ),
    [incomes, today, settledIds],
  );

  if (toConfirm.length === 0) return null;

  function run(incomeId: string, status: "received" | "not_received", message: string) {
    setPendingId(incomeId);
    startTransition(async () => {
      const result = await settleIncomeAction({ incomeId, monthIso, status });
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível registrar.");
        return;
      }
      setSettledIds((prev) => new Set(prev).add(incomeId));
      toast.success(message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timeline", "monthDetail", monthIso] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance }),
      ]);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <h2 className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">Já caiu?</h2>
      <p className="mt-1 text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">
        Confirme o que entrou pra ver quanto você tem garantido este mês.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {toConfirm.map((income) => {
          const busy = pending && pendingId === income.id;
          return (
            <li
              key={income.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                  {income.label}
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
                  <HideableValue>{income.amount.formatted}</HideableValue>
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(income.id, "received", `${income.amount.formatted} entrou no seu garantido.`)
                  }
                  className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[color:var(--semantic-positive)]/[0.14] px-2.5 py-1.5 text-[0.75rem] font-bold text-[color:var(--semantic-positive)] transition-colors hover:bg-[color:var(--semantic-positive)]/[0.22] disabled:opacity-50"
                >
                  <Check size={13} strokeWidth={2.5} aria-hidden />
                  Recebi
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(income.id, "not_received", "Marcado como não recebido.")}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[color:var(--surface-1)] px-2.5 py-1.5 text-[0.75rem] font-bold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)] disabled:opacity-50"
                >
                  <X size={13} strokeWidth={2.5} aria-hidden />
                  Não veio
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
