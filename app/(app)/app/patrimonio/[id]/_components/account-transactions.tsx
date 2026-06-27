import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { SerializedAccountTxn } from "../_actions/account-transactions-queries";

import { AccountTxnRow } from "./account-transaction-row";

export function AccountTransactionsSection({
  accountId,
  items,
  total,
  framing,
  seeAllHref,
}: {
  accountId: string;
  items: SerializedAccountTxn[];
  total: number;
  framing: "extrato" | "lancamentos";
  /** Destino do "Ver todas". Default: movimentações desta conta. A Carteira aponta pra lista consolidada. */
  seeAllHref?: string;
}) {
  const hasMore = total > items.length;
  const allHref = seeAllHref ?? `/app/patrimonio/${accountId}/movimentacoes`;
  const showSeeAll = seeAllHref ? items.length > 0 : hasMore;
  const orientation =
    total > 0
      ? framing === "extrato"
        ? `${total} ${total === 1 ? "movimentação importada" : "movimentações importadas"}`
        : `${total} ${total === 1 ? "lançamento" : "lançamentos"}`
      : null;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            Movimentações recentes
          </h2>
          {orientation ? (
            <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">{orientation}</p>
          ) : null}
        </div>
        <Link
          href={"/app/lancar" as Route}
          className="focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
        >
          Registrar
        </Link>
      </div>

      {items.length > 0 ? (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((t) => (
              <AccountTxnRow key={t.id} txn={t} />
            ))}
          </ul>
          {showSeeAll ? (
            <Link
              href={allHref as Route}
              className="focus-ring mt-3 flex items-center gap-2 border-t border-[color:var(--border-soft)] pt-3 text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)] transition-colors hover:text-[color:var(--color-brand-800)]"
            >
              <span className="flex-1">Ver todas as movimentações</span>
              <ChevronRight size={16} strokeWidth={2.25} className="shrink-0" aria-hidden />
            </Link>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-[0.6875rem] text-[color:var(--text-muted)]">
          Nenhum lançamento nesta conta ainda.
        </p>
      )}
    </section>
  );
}
