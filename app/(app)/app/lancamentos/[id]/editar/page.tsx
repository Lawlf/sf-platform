import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { listCategoriesQuery } from "../../../_actions/category-queries";
import { PageShell } from "../../../_components/page-shell";
import { fetchTransactionDetail } from "../../_actions/transactions-list-queries";
import { EditTransactionForm } from "../../_components/edit-transaction-form.client";

export const metadata: Metadata = { title: "Editar lançamento" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTransactionPage({ params }: PageProps) {
  await requireUser();
  const { id } = await params;

  const [txn, catalog] = await Promise.all([fetchTransactionDetail(id), listCategoriesQuery()]);
  if (!txn) notFound();

  return (
    <PageShell
      title="Editar lançamento"
      description="Ajuste valor, descrição, categoria ou data."
      backHref={`/app/lancamentos/${id}` as Route}
    >
      <EditTransactionForm
        transaction={{
          id: txn.id,
          direction: txn.direction,
          description: txn.description,
          categoryKey: txn.categoryKey,
          occurredAtIso: txn.occurredAtIso,
          amountCents: txn.amountCents,
          currency: txn.currency,
        }}
        catalog={catalog}
      />
    </PageShell>
  );
}
