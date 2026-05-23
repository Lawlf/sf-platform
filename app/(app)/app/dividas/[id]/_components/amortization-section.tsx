import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { AmortizationSchedule } from "@/domain/value-objects/amortization-schedule.vo";
import { Money } from "@/domain/value-objects/money.vo";

import { ScheduleRender } from "./schedule-render";

interface Props {
  debt: DebtEntity;
  amortization: AmortizationSchedule;
}

export function AmortizationSection({ debt, amortization }: Props) {
  const installments = amortization.installments;
  const sumCents = (pick: (r: (typeof installments)[number]) => Money): bigint =>
    installments.reduce<bigint>((acc, row) => acc + pick(row).toCents(), 0n);
  const totalInstallmentCents = sumCents((r) => r.installment);
  const totalPrincipalCents = sumCents((r) => r.principal);
  const totalInterestCents = sumCents((r) => r.interest);

  const paidPrincipalCents = debt.originalPrincipal.toCents() - debt.currentBalance.toCents();
  const paidPct =
    totalPrincipalCents > 0n
      ? Number((paidPrincipalCents * 10000n) / totalPrincipalCents) / 100
      : 0;
  const paidPctClamped = Math.max(0, Math.min(100, paidPct));

  // Current month: first installment whose remainingBalance ≤ currentBalance.
  const currentMonth = (() => {
    const balCents = debt.currentBalance.toCents();
    for (const row of installments) {
      if (row.remainingBalance.toCents() <= balCents) return row.month;
    }
    return installments[installments.length - 1]?.month ?? null;
  })();

  return (
    <>
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
          Resumo do contrato
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total a pagar" value={Money.fromCents(totalInstallmentCents).format()} />
          <Stat label="Juros totais" value={Money.fromCents(totalInterestCents).format()} />
          <Stat
            label="Já amortizado"
            value={Money.fromCents(paidPrincipalCents > 0n ? paidPrincipalCents : 0n).format()}
          />
          <Stat
            label="Progresso"
            value={`${paidPctClamped.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          />
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-3)]">
          <div
            className="h-full rounded-full bg-[color:var(--color-brand-500)]"
            style={{ width: `${paidPctClamped}%` }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
            Cronograma de amortização
          </h2>
          <span className="text-[11px] text-[color:var(--text-muted)]">
            {installments.length} parcelas
          </span>
        </div>
        <div className="mt-3">
          <ScheduleRender
            installments={installments.map((row) => ({
              month: row.month,
              installment: row.installment.format(),
              principal: row.principal.format(),
              interest: row.interest.format(),
              remainingBalance: row.remainingBalance.format(),
            }))}
            totals={{
              totalInstallment: Money.fromCents(totalInstallmentCents).format(),
              totalPrincipal: Money.fromCents(totalPrincipalCents).format(),
              totalInterest: Money.fromCents(totalInterestCents).format(),
            }}
            currentMonth={currentMonth}
          />
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold tabular-nums text-[color:var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}
