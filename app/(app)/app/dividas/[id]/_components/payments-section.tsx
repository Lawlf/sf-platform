import type { DebtPaymentEntity } from "@/domain/entities/debt-payment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { repos } from "@/infrastructure/container";
import { formatCents } from "@/shared/format/money-format";

import { HideableValue } from "../../../_components/money-visibility/hideable-value.client";
import { buildPaymentsView } from "../_lib/payments-view";

import type { PaymentRowData } from "./payment-detail-sheet.client";
import { PaymentsList } from "./payments-list.client";

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

export async function PaymentsSection({ debt, payments, userId, isPro }: Props) {
  const currency = debt.originalPrincipal.currency;
  const word = KIND_WORD[debt.kind];

  const view = buildPaymentsView({
    originalCents: debt.originalPrincipal.toCents(),
    currentCents: debt.currentBalance.toCents(),
    interestPortionsCents: payments.map((p) => p.interestPortion.toCents()),
  });

  const ids = payments.map((p) => p.id);
  const [withNote, withFile] = await Promise.all([
    repos.entityNotes.existingEntityIds(userId, "debt_payment", ids),
    isPro
      ? repos.entityAttachments.existingEntityIds(userId, "debt_payment", ids)
      : Promise.resolve(new Set<string>()),
  ]);

  const rows: PaymentRowData[] = payments.map((p) => ({
    id: p.id,
    dateLabel: DATE_FMT.format(p.paidAt),
    amountFormatted: p.amount.format(),
    principalFormatted: p.principalPortion.format(),
    interestFormatted: p.interestPortion.format(),
    isExtra: p.isExtra,
    hasNoteOrAttachment: withNote.has(p.id) || withFile.has(p.id),
  }));

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

      {view.hero.kind === "paidOff" ? (
        <p className="mt-2 text-[1.0625rem] font-bold leading-snug text-[color:var(--text-primary)]">
          Quitada. Você pagou os{" "}
          <HideableValue>{formatCents(view.hero.abatedCents, currency)}</HideableValue> deste {word}.
        </p>
      ) : view.hero.kind === "partial" ? (
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[color:var(--text-primary)]">
          Você já pagou{" "}
          <span className="font-bold">
            <HideableValue>{formatCents(view.hero.abatedCents, currency)}</HideableValue>
          </span>{" "}
          deste {word}. Começou em{" "}
          <HideableValue>{formatCents(view.hero.originalCents, currency)}</HideableValue>, faltam{" "}
          <span className="font-bold">
            <HideableValue>{formatCents(view.hero.currentCents, currency)}</HideableValue>
          </span>
          .
        </p>
      ) : (
        <p className="mt-2 text-[0.8125rem] text-[color:var(--text-muted)]">
          Você ainda não pagou nada deste {word}. Quando registrar um pagamento, ele aparece aqui.
        </p>
      )}

      {view.totalInterestCents > 0n ? (
        <p className="mt-1 text-[0.8125rem] text-[color:var(--text-secondary)]">
          Desse total,{" "}
          <HideableValue>{formatCents(view.totalInterestCents, currency)}</HideableValue> foram
          juros.
        </p>
      ) : null}

      <PaymentsList payments={rows} isPro={isPro} collapsedByDefault={view.collapsedByDefault} />
    </section>
  );
}
