import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";
import { isErr } from "@/shared/errors";

import { PageShell } from "../../../_components/page-shell";

import { RecordPaymentForm } from "./_components/record-payment-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PagarPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });
  const r = await getDebtDetail(
    { debts: new DrizzleDebtRepository(), payments: new DrizzleDebtPaymentRepository() },
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
    <PageShell title={`Pagar ${debt.label}`} description="Registre um pagamento desta divida.">
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
      />
    </PageShell>
  );
}
