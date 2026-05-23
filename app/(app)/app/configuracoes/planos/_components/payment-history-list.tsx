import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { Payment } from "@/domain/entities/payment.entity";

interface Props {
  payments: Payment[];
  page: number;
  pageCount: number;
  totalCount: number;
}

const PAGE_SIZE = 10;

const fmtCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const fmtDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const STATUS_LABEL: Record<Payment["status"], string> = {
  succeeded: "Pago",
  failed: "Falhou",
  pending: "Pendente",
  refunded: "Estornado",
};

function statusColor(status: Payment["status"]): string {
  if (status === "succeeded") return "text-emerald-700 dark:text-emerald-400";
  if (status === "failed") return "text-red-700 dark:text-red-400";
  return "text-[color:var(--text-secondary)]";
}

function pageHref(p: number): Route {
  return (p <= 1
    ? "/app/configuracoes/planos"
    : `/app/configuracoes/planos?p=${p}`) as Route;
}

export function PaymentHistoryList({ payments, page, pageCount, totalCount }: Props) {
  const isEmpty = totalCount === 0;
  const hasPrev = !isEmpty && page > 1;
  const hasNext = !isEmpty && page < pageCount;

  return (
    <div>
      <table className="w-full border-collapse text-left text-[0.8125rem]">
        <thead>
          <tr className="border-b border-[color:var(--border-soft)]">
            <th className="py-2.5 pr-3 text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Data
            </th>
            <th className="px-3 py-2.5 text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Valor
            </th>
            <th className="px-3 py-2.5 text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Status
            </th>
            <th className="py-2.5 pl-3 text-right text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => {
            const amount = fmtCurrency.format(Number(p.amountCents) / 100);
            const date = p.paidAt ?? p.failedAt ?? p.createdAt;
            return (
              <tr
                key={p.id}
                className="border-b border-[color:var(--border-soft)]/50"
              >
                <td className="py-2.5 pr-3 text-[color:var(--text-secondary)] tabular-nums">
                  {fmtDate.format(date)}
                </td>
                <td className="px-3 py-2.5 font-semibold text-[color:var(--text-primary)] tabular-nums">
                  {amount}
                </td>
                <td className={`px-3 py-2.5 font-semibold ${statusColor(p.status)}`}>
                  {STATUS_LABEL[p.status]}
                </td>
                <td className="py-2.5 pl-3 text-right">
                  {p.hostedInvoiceUrl ? (
                    <a
                      href={p.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.75rem] font-semibold text-[color:var(--color-brand-700)] transition-colors hover:text-[color:var(--color-brand-800)] hover:underline"
                    >
                      Ver
                      <ExternalLink size={11} strokeWidth={2.2} aria-hidden />
                    </a>
                  ) : (
                    <span className="text-[0.75rem] text-[color:var(--text-muted)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
          {isEmpty && (
            <tr>
              <td
                colSpan={4}
                className="py-6 text-center text-[0.75rem] text-[color:var(--text-muted)]"
              >
                Nenhuma fatura ainda. A primeira aparece aqui após a cobrança.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pageCount > 1 && (
      <nav
        aria-label="Paginação do histórico"
        className="mt-3 flex items-center justify-between gap-2"
      >
        {hasPrev ? (
          <Link
            href={pageHref(page - 1)}
            scroll={false}
            className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-2.5 py-1.5 text-[0.6875rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <ChevronLeft size={13} strokeWidth={2.2} aria-hidden />
            Anterior
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-[color:var(--border-soft)]/60 px-2.5 py-1.5 text-[0.6875rem] font-semibold text-[color:var(--text-muted)] opacity-60"
          >
            <ChevronLeft size={13} strokeWidth={2.2} aria-hidden />
            Anterior
          </span>
        )}

        <span className="text-[0.6875rem] font-semibold tabular-nums text-[color:var(--text-muted)]">
          {isEmpty ? "página 1 de 1" : `página ${page} de ${pageCount}`}
        </span>

        {hasNext ? (
          <Link
            href={pageHref(page + 1)}
            scroll={false}
            className="focus-ring inline-flex items-center gap-1 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-2.5 py-1.5 text-[0.6875rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            Próxima
            <ChevronRight size={13} strokeWidth={2.2} aria-hidden />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-[color:var(--border-soft)]/60 px-2.5 py-1.5 text-[0.6875rem] font-semibold text-[color:var(--text-muted)] opacity-60"
          >
            Próxima
            <ChevronRight size={13} strokeWidth={2.2} aria-hidden />
          </span>
        )}
      </nav>
      )}
    </div>
  );
}
