import type { Route } from "next";
import { notFound } from "next/navigation";

import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { computeInstallmentDueDates } from "@/domain/services/debt-calendar.service";
import { buildGoogleCalendarUrl } from "@/infrastructure/calendar/google-calendar-link";
import { loadEnv } from "@/infrastructure/config/env";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { PageShell } from "../../_components/page-shell";

import { ActionsSection } from "./_components/actions-section";
import { AmortizationSection } from "./_components/amortization-section";
import { DebtHeader } from "./_components/debt-header";
import { InstallmentPurchasesSection } from "./_components/installment-purchases-section";
import { NoScheduleSection } from "./_components/no-schedule-section";
import { PaymentsSection } from "./_components/payments-section";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DebtDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();

  const r = await getDebtDetail(
    { debts: new DrizzleDebtRepository(), payments: new DrizzleDebtPaymentRepository() },
    { userId: user.id, debtId: id },
  );
  if (isErr(r)) notFound();
  const { debt, amortization, payments } = r.value;
  const dueDates = computeInstallmentDueDates(debt, amortization);
  const hasCalendarSchedule = dueDates.length > 0;
  const googleCalendarUrl = hasCalendarSchedule
    ? buildGoogleCalendarUrl({
        debt,
        dueDates,
        appUrl: loadEnv().NEXT_PUBLIC_APP_URL,
      })
    : null;

  return (
    <PageShell backHref={"/app/dividas" as Route}>
      <DebtHeader debt={debt} />

      <ActionsSection
        debt={debt}
        hasCalendarSchedule={hasCalendarSchedule}
        googleCalendarUrl={googleCalendarUrl}
      />

      {debt.kind === "credit_card" ? <InstallmentPurchasesSection debt={debt} /> : null}

      {amortization ? (
        <AmortizationSection debt={debt} amortization={amortization} />
      ) : debt.kind === "recurring" ? null : (
        <NoScheduleSection kind={debt.kind} />
      )}

      {debt.kind === "recurring" ? null : <PaymentsSection payments={payments} />}
    </PageShell>
  );
}
