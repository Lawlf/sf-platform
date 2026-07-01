import { FileText } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { listIncomes } from "@/application/use-cases/income/list-incomes.use-case";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";
import { toIsoDate } from "@/shared/format/dates";

import { ActionRow, ActionRowGroup } from "../../../_components/action-row";
import { PageShell } from "../../../_components/page-shell";
import { EditIncomeForm } from "../../_components/edit-income-form";

export const metadata: Metadata = { title: "Editar renda" };

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const profileId = await getActiveProfileId();

  const r = await listIncomes({ incomes: repos.incomes }, { profileId });
  if (!isOk(r)) return notFound();
  const income = r.value.find((i) => i.id === id);
  if (!income) return notFound();

  return (
    <PageShell
      title="Editar renda"
      description="Ajuste os dados desta fonte de renda."
      backHref={"/app/renda" as Route}
    >
      <EditIncomeForm
        income={{
          id: income.id,
          label: income.label,
          amountCents: income.amount.toCents().toString(),
          currency: income.amount.currency,
          frequency: income.frequency,
          startDateIso: toIsoDate(income.startDate),
          endDateIso: income.endDate ? toIsoDate(income.endDate) : null,
          paymentDay: income.paymentDay,
          isEstimated: income.isEstimated,
          sourceBreakdown: income.sourceBreakdown,
        }}
      >
        <ActionRowGroup>
          <ActionRow
            icon={FileText}
            title="Contrato e anotações"
            href={`/app/renda/${id}/anotacoes` as Route}
          />
        </ActionRowGroup>
      </EditIncomeForm>
    </PageShell>
  );
}
