import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

interface Props {
  payments: DebtPaymentEntity[];
}

export function PaymentsSection({ payments }: Props) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
          Pagamentos registrados
        </h2>
        <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
          {payments.length} {payments.length === 1 ? "registro" : "registros"}
        </span>
      </div>
      {payments.length === 0 ? (
        <p className="mt-3 text-[0.75rem] text-[color:var(--text-muted)]">
          Nenhum pagamento registrado.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
                  {DATE_FMT.format(p.paidAt)}
                </p>
                <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
                  {p.principalPortion.format()} principal + {p.interestPortion.format()} juros
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                  {p.amount.format()}
                </span>
                {p.isExtra ? (
                  <span className="inline-flex items-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
                    Extra
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
