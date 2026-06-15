import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { PageShell } from "../../../_components/page-shell";

import { RecordPaymentForm } from "./_components/record-payment-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PagarPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();
  const r = await getDebtDetail(
    { debts: repos.debts, payments: repos.debtPayments },
    { userId: user.id, debtId: id },
  );
  if (isErr(r)) notFound();
  const { debt, amortization, payments } = r.value;

  if (debt.status !== "active") {
    redirect(`/app/dividas/${debt.id}` as Route);
  }

  // Compute next installment number: count of payments + 1 (capped at schedule length).
  const nextMonth = Math.min((payments.length ?? 0) + 1, amortization?.installments.length ?? 0);
  const next = amortization?.installmentAt(nextMonth) ?? null;
  const defaultPaidAt = new Date().toISOString().slice(0, 10);

  return (
    <PageShell
      title={`Pagar ${debt.label}`}
      description="Registre um pagamento dessa dívida."
      backHref={`/app/dividas/${debt.id}` as Route}
    >
      <RecordPaymentForm
        debtId={debt.id}
        defaultPaidAt={defaultPaidAt}
        defaults={
          next
            ? {
                amountCents: (next.principal.toCents() + next.interest.toCents()).toString(),
                principalCents: next.principal.toCents().toString(),
                interestCents: next.interest.toCents().toString(),
              }
            : null
        }
        currentBalanceFormatted={debt.currentBalance.format()}
        isPro={user.isPro}
      />
    </PageShell>
  );
}
