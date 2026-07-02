import { Clock, EyeOff } from "lucide-react";
import type { ReactNode } from "react";

import { dateOnlyFormat } from "@/shared/format/date-only";

import type { TransactionDetail } from "../../_actions/transactions-list-queries";

const DATE_FMT = dateOnlyFormat({ dateStyle: "short" });

interface Props {
  txn: TransactionDetail;
  action?: ReactNode;
}

export function TransactionHeader({ txn, action }: Props) {
  const isIn = txn.direction === "in";
  const scheduled = txn.status === "scheduled";
  const excluded = txn.excludedFromTotals;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            {txn.categoryLabel ?? "Sem categoria"}
          </div>
          <h1
            className="mt-1 text-[1.5rem] font-extrabold leading-tight text-[color:var(--text-primary)]"
            style={{ letterSpacing: "-0.4px" }}
          >
            {txn.description}
          </h1>
          {scheduled || excluded ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {scheduled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--surface-3)] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
                  <Clock size={11} strokeWidth={2.25} aria-hidden />
                  Previsto
                </span>
              ) : null}
              {excluded ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--surface-3)] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--text-secondary)]">
                  <EyeOff size={11} strokeWidth={2.25} aria-hidden />
                  Não conta no mês
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {action}
      </div>

      <div className="mt-4">
        <span
          className={`text-[1.75rem] font-extrabold tabular-nums ${
            excluded
              ? "text-[color:var(--text-muted)] line-through"
              : isIn
                ? "text-[color:var(--semantic-positive)]"
                : "text-[color:var(--semantic-negative)]"
          }`}
        >
          {isIn ? "+" : "-"}
          {txn.amountFormatted}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[color:var(--border-soft)] pt-3 text-sm">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Data
          </div>
          <div className="mt-0.5 font-bold tabular-nums text-[color:var(--text-primary)]">
            {DATE_FMT.format(new Date(txn.occurredAtIso))}
          </div>
        </div>
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Conta
          </div>
          <div className="mt-0.5 font-bold text-[color:var(--text-primary)]">
            {txn.accountLabel ?? "Carteira"}
          </div>
        </div>
      </div>

      {txn.assetLabel ? (
        <div className="mt-3 border-t border-[color:var(--border-soft)] pt-3">
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Atrelado a
          </div>
          <div className="mt-0.5 font-bold text-[color:var(--text-primary)]">{txn.assetLabel}</div>
        </div>
      ) : null}
    </section>
  );
}
