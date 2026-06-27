import type { Route } from "next";
import { notFound } from "next/navigation";

import { fetchGoalsLinkedToDebt } from "@/app/(app)/app/metas/_actions/goal-queries";
import { getDebtDetail } from "@/application/use-cases/debt/get-debt-detail.use-case";
import { computeInstallmentDueDates } from "@/domain/services/debt-calendar.service";
import { buildGoogleCalendarUrl } from "@/infrastructure/calendar/google-calendar-link";
import type { AlarmOffset } from "@/infrastructure/calendar/ics-builder";
import { loadEnv } from "@/infrastructure/config/env";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

// Mapeia a antecedência do aviso de vencimento (0/1/3/7 dias) pro alarme do
// .ics. 0 = no dia = sem alarme antecipado.
function alarmFromDaysBefore(days: number | undefined): AlarmOffset {
  switch (days) {
    case 0:
      return "none";
    case 7:
      return "7d";
    case 3:
      return "3d";
    default:
      return "1d";
  }
}

import { buildCategoryLabeler } from "../../_actions/_category-labels";
import { EntityNotesAndFiles } from "../../_components/notes-files/entity-notes-and-files";
import { PageShell } from "../../_components/page-shell";

import { fetchOverdueStateForDebt } from "./_actions/overdue-state";
import { ActionsSection } from "./_components/actions-section";
import { AmortizationSection } from "./_components/amortization-section";
import { DebtHeader } from "./_components/debt-header";
import { DueReminder } from "./_components/due-reminder.client";
import { InstallmentPurchasesSection } from "./_components/installment-purchases-section";
import { LinkedAssetCard } from "./_components/linked-asset-card";
import { MinimumPaymentNotice } from "./_components/minimum-payment-notice";
import { NoScheduleSection } from "./_components/no-schedule-section";
import { OutOfMonthBanner } from "./_components/out-of-month-banner";
import { OverdueBanner } from "./_components/overdue-banner.client";
import { PaidOffBanner } from "./_components/paid-off-banner";
import { PaymentsSection } from "./_components/payments-section";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DebtDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();
  const profileId = await getActiveProfileId();

  const r = await getDebtDetail(
    { debts: repos.debts, payments: repos.debtPayments },
    { userId: user.id, profileId, debtId: id },
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

  const prefs = hasCalendarSchedule
    ? await repos.notificationPreferences.findForUser(user.id)
    : null;
  const defaultAlarm = alarmFromDaysBefore(prefs?.debtDueDaysBefore);

  const linkedGoals = await fetchGoalsLinkedToDebt(id);
  const labelCategory = await buildCategoryLabeler(user.id);

  const overdueState =
    debt.status === "active"
      ? await fetchOverdueStateForDebt(id, user.id, profileId)
      : null;

  const allocations = await repos.assetDebtAllocations.findByDebt(id);
  const linkedAssets: { id: string; label: string }[] = [];
  for (const alloc of allocations) {
    const asset = await repos.assets.findById(alloc.assetId, profileId);
    if (asset) linkedAssets.push({ id: asset.id, label: asset.label });
  }

  return (
    <PageShell backHref={"/app/dividas" as Route}>
      <DebtHeader
        debt={debt}
        categoryLabelText={labelCategory(debt.expenseCategory) ?? "Outros"}
        scheduleEndDate={dueDates.at(-1)?.dueDate ?? null}
      />

      {debt.status === "paid_off" ? <PaidOffBanner debt={debt} /> : null}
      {debt.status === "written_off" ? <OutOfMonthBanner /> : null}
      {overdueState ? (
        <OverdueBanner
          debtId={id}
          dueDay={overdueState.dueDay}
          cycleIso={overdueState.cycleIso}
          amountFormatted={overdueState.amountFormatted}
          canAdjust={debt.kind === "credit_card" || debt.kind === "personal_loan"}
        />
      ) : null}

      <LinkedAssetCard assets={linkedAssets} />

      <MinimumPaymentNotice debt={debt} />

      {debt.status === "active" && hasCalendarSchedule ? (
        <DueReminder
          debtId={id}
          googleCalendarUrl={googleCalendarUrl}
          defaultAlarm={defaultAlarm}
          isPro={user.isPro}
          dueEnabled={prefs?.debtDueEnabled ?? true}
          dueDaysBefore={prefs?.debtDueDaysBefore ?? 3}
        />
      ) : null}

      <ActionsSection debt={debt} linkedGoals={linkedGoals} />

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

      <EntityNotesAndFiles
        entityType="debt"
        entityId={debt.id}
        userId={user.id}
        isPro={user.isPro}
      />
    </PageShell>
  );
}
