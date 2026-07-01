import { TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import { Money } from "@/domain/value-objects/money.vo";

// Piso: abaixo de R$200 de fatura o aviso pesa mais que ajuda (mínimo miúdo).
const MIN_STATEMENT_CENTS = 20_000n;
const MIN_PCT = 15n;

interface Props {
  debt: DebtEntity;
}

export function MinimumPaymentNotice({ debt }: Props) {
  if (debt.kind !== "credit_card" || debt.status !== "active") return null;

  const statementCents = debt.currentStatement.toCents();
  if (statementCents <= MIN_STATEMENT_CENTS) return null;

  const minimumCents = (statementCents * MIN_PCT) / 100n;
  const rolledCents = statementCents - minimumCents;
  const minimum = Money.fromCents(minimumCents).format();
  const rolled = Money.fromCents(rolledCents).format();

  const monthlyRatePct = debt.revolvingMonthlyRate
    ? Math.round(debt.revolvingMonthlyRate.toDecimal() * 100)
    : null;

  return (
    <section
      aria-label="Sobre o pagamento mínimo"
      className="flex gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-5"
    >
      <TriangleAlert
        size={22}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-[color:var(--text-muted)]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
          Pagar o mínimo não fecha a fatura
        </p>
        <p className="mt-1 text-sm leading-snug text-[color:var(--text-secondary)]">
          O mínimo é <strong className="text-[color:var(--text-primary)]">{minimum}</strong>. Os{" "}
          <strong className="text-[color:var(--text-primary)]">{rolled}</strong> que sobram entram no
          rotativo e passam a cobrar juro, que costuma ser o mais caro do mercado.
          {monthlyRatePct !== null ? ` No seu caso, cerca de ${monthlyRatePct}% ao mês.` : ""}
        </p>
        <Link
          href={`/app/simular/rotativo?debtId=${debt.id}` as Route}
          className="focus-ring mt-2 inline-block text-[0.8125rem] font-semibold text-[color:var(--text-muted)] underline-offset-2 hover:underline"
        >
          Ver quanto custa rolar essa fatura
        </Link>
      </div>
    </section>
  );
}
