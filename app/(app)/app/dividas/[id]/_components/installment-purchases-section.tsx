import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import type { CreditCardDebt, DebtStatus } from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";

interface Props {
  debt: CreditCardDebt;
}

export function InstallmentPurchasesSection({ debt }: Props) {
  if (debt.installmentPurchases.length === 0) {
    if (debt.status !== "active") return null;
    return (
      <section className="rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-center backdrop-blur-xl">
        <p className="text-[0.8125rem] text-[color:var(--text-muted)]">
          Sem compras parceladas cadastradas.
        </p>
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <Link href={`/app/dividas/${debt.id}/compras` as Route}>Adicionar compras</Link>
          </Button>
        </div>
      </section>
    );
  }

  const totalMonthly = debt.installmentPurchases.reduce<bigint>(
    (acc, p) => acc + p.monthlyValue.toCents(),
    0n,
  );

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
          Compras parceladas
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
            {debt.installmentPurchases.length}{" "}
            {debt.installmentPurchases.length === 1 ? "compra" : "compras"}
          </span>
          {debt.status === "active" ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/app/dividas/${debt.id}/compras` as Route}>Gerenciar</Link>
            </Button>
          ) : null}
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {debt.installmentPurchases.map((p, idx) => (
          <li
            key={`${p.description}-${idx}`}
            className="flex items-start justify-between gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
                {p.description}
              </p>
              <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
                {p.installmentsTotal - p.installmentsRemaining}/{p.installmentsTotal} pagas · Total{" "}
                {p.total.format()}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-sm font-semibold tabular-nums text-[color:var(--text-primary)]">
                {p.monthlyValue.format()}
              </span>
              <span className="text-[0.625rem] uppercase tracking-wide text-[color:var(--text-muted)]">
                /mês
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-[color:var(--border-soft)] pt-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
          Total mensal
        </span>
        <span className="text-sm font-bold tabular-nums text-[color:var(--text-primary)]">
          {Money.fromCents(totalMonthly).format()}
        </span>
      </div>
    </section>
  );
}

// Re-exposed for status check.
export type { DebtStatus };
