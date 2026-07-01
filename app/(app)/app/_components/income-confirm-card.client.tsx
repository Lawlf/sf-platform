"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { SimpleTooltip } from "@/app/components/ui/tooltip";
import { Spinner } from "@/app/components/ui/spinner";
import { todayIso } from "@/shared/format/dates";

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
  const [pendingStatus, setPendingStatus] = useState<"received" | "not_received" | null>(null);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());

  const today = todayIso();
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

  const OPPOSITE: Record<"received" | "not_received", "received" | "not_received"> = {
    received: "not_received",
    not_received: "received",
  };

  function messageFor(income: SerializedIncomeRow, status: "received" | "not_received"): string {
    return status === "received"
      ? `${income.amount.formatted} entrou no seu garantido.`
      : "Tudo bem. Seu garantido segue de pé.";
  }

  function run(incomeId: string, status: "received" | "not_received") {
    const income = incomes.find((i) => i.id === incomeId);
    setPendingId(incomeId);
    setPendingStatus(status);
    startTransition(async () => {
      const result = await settleIncomeAction({ incomeId, monthIso, status });
      setPendingId(null);
      setPendingStatus(null);
      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível registrar.");
        return;
      }
      setSettledIds((prev) => new Set(prev).add(incomeId));
      toast.success(income ? messageFor(income, status) : "Registrado.", {
        action: {
          label: "Desfazer",
          onClick: () => run(incomeId, OPPOSITE[status]),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timeline", "monthDetail", monthIso] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance }),
      ]);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col">
      <div className="px-1">
        <h2 className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">Já caiu?</h2>
        <p className="mt-1 text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">
          Confirme o que entrou pra ver quanto você tem garantido este mês.
        </p>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {toConfirm.map((income) => {
          const busy = pending && pendingId === income.id;
          const receivingNow = busy && pendingStatus === "received";
          const rejectingNow = busy && pendingStatus === "not_received";
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
              <div className="flex shrink-0 items-center gap-2">
                <SimpleTooltip label="Recebi">
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Recebi"
                    onClick={() => run(income.id, "received")}
                    className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--semantic-positive)]/12 text-[color:var(--semantic-positive)] transition-colors hover:bg-[color:var(--semantic-positive)]/20 disabled:opacity-50"
                  >
                    {receivingNow ? (
                      <Spinner size={15} decorative />
                    ) : (
                      <Check size={16} strokeWidth={2.5} aria-hidden />
                    )}
                  </button>
                </SimpleTooltip>
                <SimpleTooltip label="Não veio">
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Não veio"
                    onClick={() => run(income.id, "not_received")}
                    className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--semantic-negative)]/12 hover:text-[color:var(--semantic-negative)] disabled:opacity-50"
                  >
                    {rejectingNow ? (
                      <Spinner size={15} decorative />
                    ) : (
                      <X size={16} strokeWidth={2.5} aria-hidden />
                    )}
                  </button>
                </SimpleTooltip>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
