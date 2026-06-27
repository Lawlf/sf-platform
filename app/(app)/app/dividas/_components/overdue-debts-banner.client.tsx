"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";

import { HideableValue } from "../../_components/money-visibility/hideable-value.client";
import { queryKeys } from "../../_lib/query-keys";
import { settleOverdueAction } from "../[id]/_actions/settle-overdue.action";
import type { OverduePayload } from "../_actions/overdue-list";
import { showSettleToast } from "../_lib/settle-toast";

interface Props {
  overdue: OverduePayload[];
}

export function OverdueDebtsBanner({ overdue }: Props) {
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const visible = overdue.filter((o) => !settled.has(o.debtId));
  if (visible.length === 0) return null;

  function markSettled(debtId: string) {
    setSettled((prev) => new Set(prev).add(debtId));
  }

  return (
    <section
      className="rounded-2xl border p-4"
      style={{
        borderColor: "color-mix(in srgb, var(--semantic-negative) 30%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--semantic-negative) 8%, transparent)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "color-mix(in srgb, var(--semantic-negative) 16%, transparent)",
            color: "var(--semantic-negative)",
          }}
        >
          <AlertCircle size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
            {visible.length === 1 ? "Conta vencida" : `${visible.length} contas vencidas`}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
            Já pagou? Toque em Paguei que abato da dívida.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {visible.map((item) => (
              <OverdueRow key={item.debtId} item={item} onSettled={() => markSettled(item.debtId)} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function OverdueRow({ item, onSettled }: { item: OverduePayload; onSettled: () => void }) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPaid() {
    setError(null);
    startTransition(async () => {
      const r = await settleOverdueAction({ debtId: item.debtId, cycleIso: item.cycleIso });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      showSettleToast(r.data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      ]);
      onSettled();
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1">
          <Link
            href={`/app/dividas/${item.debtId}` as Route}
            className="focus-ring truncate font-semibold text-[color:var(--text-primary)] hover:underline"
          >
            {item.label}
          </Link>{" "}
          <span className="text-[0.8125rem] text-[color:var(--text-secondary)]">
            venceu dia {item.dueDay}
          </span>
        </span>
        {item.amountFormatted ? (
          <span className="shrink-0 text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
            <HideableValue>{item.amountFormatted}</HideableValue>
          </span>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-[0.8125rem] text-[color:var(--semantic-negative)]">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={pending} aria-busy={pending || undefined} onClick={onPaid} className="relative">
          <span className={pending ? "opacity-0" : "opacity-100"}>Paguei</span>
          {pending ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner size={14} />
            </span>
          ) : null}
        </Button>
        {item.canAdjust ? (
          <Link
            href={`/app/dividas/${item.debtId}/pagar` as Route}
            className="focus-ring text-[0.8125rem] font-semibold text-[color:var(--text-muted)] underline-offset-2 hover:underline"
          >
            Ajustar
          </Link>
        ) : null}
      </div>
    </li>
  );
}
