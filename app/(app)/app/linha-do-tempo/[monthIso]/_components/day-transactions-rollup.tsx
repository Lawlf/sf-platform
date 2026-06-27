import { ChevronRight, Receipt } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { SerializedTransactionRow } from "../../../_actions/timeline-month-detail";

function formatBrlSigned(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  const fmt = reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${negative ? "-" : "+"}${fmt}`;
}

export function DayTransactionsRollup({
  transactions,
}: {
  transactions: SerializedTransactionRow[];
}) {
  const count = transactions.length;
  const netCents = transactions.reduce(
    (acc, t) => acc + (t.direction === "in" ? 1n : -1n) * BigInt(t.amount.cents),
    0n,
  );
  const day = transactions[0]?.dateIso.slice(0, 10) ?? "";
  const tone = netCents >= 0n ? "positive" : "negative";
  const valueColor =
    tone === "positive"
      ? "text-[color:var(--semantic-positive)]"
      : "text-[color:var(--semantic-negative)]";

  return (
    <Link
      href={`/app/lancamentos?date=${day}` as Route}
      className="focus-ring flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 transition-colors hover:bg-[color:var(--surface-2)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Receipt size={16} strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
          {count} {count === 1 ? "lançamento" : "lançamentos"}
        </div>
        <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
          Ver e classificar
        </div>
      </div>
      <span className={`shrink-0 text-[0.9375rem] font-extrabold tabular-nums ${valueColor}`}>
        {formatBrlSigned(netCents)}
      </span>
      <ChevronRight
        size={16}
        strokeWidth={2}
        className="shrink-0 text-[color:var(--text-muted)]"
        aria-hidden
      />
    </Link>
  );
}
