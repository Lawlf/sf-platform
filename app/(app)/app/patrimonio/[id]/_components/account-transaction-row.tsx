import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
import { formatDateSafe } from "@/shared/format/date-format";

import type { SerializedAccountTxn } from "../_actions/account-transactions-queries";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

export function AccountTxnRow({ txn }: { txn: SerializedAccountTxn }) {
  const isIn = txn.direction === "in";
  // Saída em cor neutra, nunca vermelho-alarme: pagar a conta de luz não é
  // perigo. Vermelho fica reservado pra dívida correndo juros no comprometido.
  const amountColor = isIn
    ? "text-[color:var(--semantic-positive)]"
    : "text-[color:var(--text-primary)]";
  const sign = isIn ? "+" : "-";
  const date = formatDateSafe(DATE_FMT, new Date(txn.occurredAtIso));
  const meta = [txn.categoryLabel, date].filter(Boolean).join(" · ");

  return (
    <li>
      <Link
        href={`/app/lancamentos/${txn.id}` as Route}
        className="focus-ring flex items-center gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] text-[color:var(--text-secondary)]">
            {txn.description}
          </p>
          <p className="mt-0.5 text-[0.625rem] text-[color:var(--text-muted)]">{meta}</p>
        </div>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${amountColor}`}>
          {sign}
          <HideableValue>{txn.amountFormatted}</HideableValue>
        </span>
        <ChevronRight
          size={16}
          strokeWidth={2}
          className="shrink-0 text-[color:var(--text-muted)]"
          aria-hidden
        />
      </Link>
    </li>
  );
}
