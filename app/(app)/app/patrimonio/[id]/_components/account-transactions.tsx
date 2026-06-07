import type { Route } from "next";
import Link from "next/link";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export function AccountTransactionsSection({ transactions }: { transactions: TransactionEntity[] }) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Movimentações recentes</h2>
        <Link
          href={"/app/lancar" as Route}
          className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
        >
          Lançar
        </Link>
      </div>

      {transactions.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[0.6875rem] text-[color:var(--text-muted)]">
          Nenhum lançamento nesta conta ainda.
        </p>
      )}
    </section>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionEntity }) {
  const isIn = transaction.direction === "in";
  const amountColor = isIn
    ? "text-[color:var(--semantic-positive)]"
    : "text-[color:var(--semantic-negative)]";
  const sign = isIn ? "+" : "-";

  return (
    <li className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
          {transaction.description}
        </p>
        <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
          {transaction.category ?? "Sem categoria"} · {DATE_FMT.format(transaction.occurredAt)}
        </p>
      </div>
      <span className={`shrink-0 text-sm font-semibold ${amountColor}`}>
        {sign}
        <HideableValue>{transaction.amount.format()}</HideableValue>
      </span>
    </li>
  );
}
