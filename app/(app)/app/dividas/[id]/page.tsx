import { Calculator, CalendarClock, FileText, HandCoins, Target } from "lucide-react";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { fetchGoalsLinkedToDebt } from "@/app/(app)/app/metas/_actions/goal-queries";
import { buildGoalSeedQuery } from "@/app/(app)/app/simular/_lib/goal-seed";
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
import { ActionRow, ActionRowGroup } from "../../_components/action-row";
import { PageShell } from "../../_components/page-shell";

import { fetchOverdueStateForDebt } from "./_actions/overdue-state";
import { DebtHeader } from "./_components/debt-header";
import { DebtOverflowMenu } from "./_components/debt-overflow-menu.client";
import { LinkedAssetCard } from "./_components/linked-asset-card";
import { MinimumPaymentNotice } from "./_components/minimum-payment-notice";
import { MonthDecisionsMenu } from "./_components/month-decisions-menu.client";
import { OutOfMonthBanner } from "./_components/out-of-month-banner";
import { OverdueBanner } from "./_components/overdue-banner.client";
import { PaidOffBanner } from "./_components/paid-off-banner";
import { ReactivateDebtButton } from "./_components/reactivate-debt-button";
import { loadHistorico } from "./historico/_actions/historico.action";
import { HistoricoClient } from "./historico/_components/historico-client";

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
  const { debt, amortization } = r.value;
  const isActive = debt.status === "active";
  const isRecurring = debt.kind === "recurring";
  const isPayrollLoan = debt.kind === "personal_loan" && debt.payrollDeducted;
  const payLabel = debt.kind === "credit_card" ? "Paguei a fatura" : "Paguei a parcela";
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
  const payoffGoal = linkedGoals.find(
    (g) => g.goal.type === "debt_payoff" && g.goal.status === "active",
  );
  const labelCategory = await buildCategoryLabeler(user.id);

  const overdueState = isActive ? await fetchOverdueStateForDebt(id, user.id, profileId) : null;

  const historico = await loadHistorico(id);

  const allocations = await repos.assetDebtAllocations.findByDebt(id);
  const linkedAssets: { id: string; label: string }[] = [];
  for (const alloc of allocations) {
    const asset = await repos.assets.findById(alloc.assetId, profileId);
    if (asset) linkedAssets.push({ id: asset.id, label: asset.label });
  }

  return (
    <PageShell backHref={"/app/dividas" as Route} backPreferFallback>
      <DebtHeader
        debt={debt}
        categoryLabelText={labelCategory(debt.expenseCategory) ?? "Outros"}
        scheduleEndDate={dueDates.at(-1)?.dueDate ?? null}
        action={
          <div className="flex shrink-0 items-center">
            {isActive ? (
              <MonthDecisionsMenu debtId={id} debtLabel={debt.label} isRecurring={isRecurring} />
            ) : null}
            <DebtOverflowMenu
              debtId={id}
              debtLabel={debt.label}
              hasCalendarSchedule={isActive && hasCalendarSchedule && !isPayrollLoan}
              googleCalendarUrl={googleCalendarUrl}
              defaultAlarm={defaultAlarm}
              isPro={user.isPro}
              dueEnabled={prefs?.debtDueEnabled ?? true}
              dueDaysBefore={prefs?.debtDueDaysBefore ?? 3}
            />
          </div>
        }
      />

      {debt.status === "paid_off" ? <PaidOffBanner debt={debt} /> : null}
      {debt.status === "written_off" ? <OutOfMonthBanner /> : null}
      {overdueState && !isPayrollLoan ? (
        <OverdueBanner
          debtId={id}
          dueDay={overdueState.dueDay}
          cycleIso={overdueState.cycleIso}
          amountFormatted={overdueState.amountFormatted}
          canAdjust={debt.kind === "credit_card" || debt.kind === "personal_loan"}
        />
      ) : null}

      {!isActive ? (
        <ReactivateDebtButton
          debtId={id}
          label={debt.label}
          actionLabel={debt.status === "written_off" ? "Voltar pro meu mês" : "Reativar dívida"}
        />
      ) : null}

      <ActionRowGroup>
        {isActive && !isRecurring && !isPayrollLoan ? (
          <ActionRow
            icon={HandCoins}
            title={payLabel}
            tone="primary"
            href={`/app/dividas/${id}/pagar` as Route}
          />
        ) : null}
        {isActive && !isRecurring ? (
          <ActionRow
            icon={Calculator}
            title="Ver se vale adiantar"
            href={`/app/simular/quitacao?debtId=${id}` as Route}
          />
        ) : null}
        {isActive && isRecurring ? (
          <ActionRow icon={Target} title="Guardar esse valor" href={"/app/metas/nova" as Route} />
        ) : null}
        {isActive && !isRecurring && payoffGoal ? (
          <ActionRow
            icon={Target}
            title="Ver meta de quitação"
            href={`/app/metas/${payoffGoal.goal.id}` as Route}
          />
        ) : null}
        {isActive && !isRecurring && !payoffGoal ? (
          <ActionRow
            icon={Target}
            title="Criar meta de quitação"
            href={
              `/app/metas/nova?${buildGoalSeedQuery({ type: "debt_payoff", debtId: id })}` as Route
            }
          />
        ) : null}
        <ActionRow
          icon={CalendarClock}
          title="Cronograma de parcelas"
          href={`/app/dividas/${id}/cronograma` as Route}
        />
        <ActionRow
          icon={FileText}
          title="Contrato e anotações"
          href={`/app/dividas/${id}/anotacoes` as Route}
        />
      </ActionRowGroup>

      <HistoricoClient
        debtId={id}
        debtLabel={debt.label}
        initialAdjustments={historico.adjustments}
        initialTimeline={historico.timeline}
      />

      <LinkedAssetCard assets={linkedAssets} />

      <MinimumPaymentNotice debt={debt} />
    </PageShell>
  );
}
