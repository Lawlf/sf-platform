import { Paperclip } from "lucide-react";

import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { formatCents } from "@/shared/format/money-format";

import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";
import { EntityNotesAndFiles } from "../../../_components/notes-files/entity-notes-and-files";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

const KIND_WORD: Record<DebtEntity["kind"], string> = {
  financing: "financiamento",
  personal_loan: "empréstimo",
  credit_card: "cartão",
  overdraft: "cheque especial",
  recurring: "dívida",
};

interface Props {
  debt: DebtEntity;
  payments: DebtPaymentEntity[];
  userId: string;
  isPro: boolean;
}

export function PaymentsSection({ debt, payments, userId, isPro }: Props) {
  const original = debt.originalPrincipal.toCents();
  const current = debt.currentBalance.toCents();
  const abated = original - current;
  const word = KIND_WORD[debt.kind];
  const currency = debt.originalPrincipal.currency;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
          Quanto você já pagou
        </h2>
        <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
          {payments.length} {payments.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      {original > 0n && abated > 0n ? (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-[color:var(--text-primary)]">
          Você já pagou{" "}
          <span className="font-semibold">
            <HideableValue>{formatCents(abated, currency)}</HideableValue>
          </span>{" "}
          deste {word}. Começou em{" "}
          <HideableValue>{formatCents(original, currency)}</HideableValue>, faltam{" "}
          <span className="font-semibold">
            <HideableValue>{formatCents(current, currency)}</HideableValue>
          </span>
          .
        </p>
      ) : (
        <p className="mt-2 text-[0.8125rem] text-[color:var(--text-muted)]">
          Você ainda não pagou nada deste {word}. Quando registrar um pagamento, ele aparece aqui.
        </p>
      )}

      {payments.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
                    {DATE_FMT.format(p.paidAt)}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
                    <HideableValue>{p.principalPortion.format()}</HideableValue> principal +{" "}
                    <HideableValue>{p.interestPortion.format()}</HideableValue> juros
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-[color:var(--text-primary)]">
                    <HideableValue>{p.amount.format()}</HideableValue>
                  </span>
                  {p.isExtra ? (
                    <span className="inline-flex items-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
                      Extra
                    </span>
                  ) : null}
                </div>
              </div>

              <details className="mt-2">
                <summary className="flex w-fit cursor-pointer items-center gap-1.5 text-[0.6875rem] font-semibold text-[color:var(--text-muted)] [&::-webkit-details-marker]:hidden">
                  <Paperclip size={12} strokeWidth={2} aria-hidden />
                  Comprovante e nota
                </summary>
                <div className="mt-3">
                  <EntityNotesAndFiles
                    entityType="debt_payment"
                    entityId={p.id}
                    userId={userId}
                    isPro={isPro}
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
