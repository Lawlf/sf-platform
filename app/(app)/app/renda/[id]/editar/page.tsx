import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { listIncomes } from "@/application/use-cases/income/list-incomes.use-case";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { EntityNotesAndFiles } from "../../../_components/notes-files/entity-notes-and-files";
import { PageShell } from "../../../_components/page-shell";
import { EditIncomeForm } from "../../_components/edit-income-form";

export const metadata: Metadata = { title: "Editar renda" };

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const r = await listIncomes({ incomes: new DrizzleIncomeRepository() }, { userId: user.id });
  if (!isOk(r)) return notFound();
  const income = r.value.find((i) => i.id === id);
  if (!income) return notFound();

  return (
    <PageShell
      title="Editar renda"
      description="Ajuste os dados desta fonte de renda."
      backHref={"/app/renda" as Route}
    >
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
        <EditIncomeForm
          income={{
            id: income.id,
            label: income.label,
            amountCents: income.amount.toCents().toString(),
            currency: income.amount.currency,
            frequency: income.frequency,
            startDateIso: income.startDate.toISOString().slice(0, 10),
            endDateIso: income.endDate ? income.endDate.toISOString().slice(0, 10) : null,
            paymentDay: income.paymentDay,
          }}
        />
      </section>

      <EntityNotesAndFiles
        entityType="income"
        entityId={income.id}
        userId={user.id}
        isPro={user.isPro}
      />
    </PageShell>
  );
}
