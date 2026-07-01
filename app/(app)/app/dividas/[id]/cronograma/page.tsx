import type { Route } from "next";
import { notFound } from "next/navigation";

import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { PageShell } from "../../../_components/page-shell";
import { AmortizationSection } from "../_components/amortization-section";
import { InstallmentPurchasesSection } from "../_components/installment-purchases-section";
import { NoScheduleSection } from "../_components/no-schedule-section";
import { PaymentsSection } from "../_components/payments-section";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DebtCronogramaPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();
  const profileId = await getActiveProfileId();

  const r = await getDebtDetail(
    { debts: repos.debts, payments: repos.debtPayments },
    { userId: user.id, profileId, debtId: id },
  );
  if (isErr(r)) notFound();
  const { debt, amortization, payments } = r.value;

  return (
    <PageShell
      title={`Cronograma de parcelas · ${debt.label}`}
      backHref={`/app/dividas/${id}` as Route}
    >
      {debt.kind === "credit_card" ? <InstallmentPurchasesSection debt={debt} /> : null}

      {amortization ? (
        <AmortizationSection
          debt={debt}
          amortization={amortization}
          payments={payments}
          isPro={user.isPro}
        />
      ) : debt.kind === "recurring" ? null : (
        <NoScheduleSection kind={debt.kind} />
      )}

      {!amortization && debt.kind !== "recurring" ? (
        <PaymentsSection debt={debt} payments={payments} userId={user.id} isPro={user.isPro} />
      ) : null}
    </PageShell>
  );
}
