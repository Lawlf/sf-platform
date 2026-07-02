import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { ActionRow, ActionRowGroup } from "../../_components/action-row";
import { PageShell } from "../../_components/page-shell";
import { fetchTransactionDetail } from "../_actions/transactions-list-queries";

import { TransactionExcludeToggle } from "./_components/transaction-exclude-toggle.client";
import { TransactionHeader } from "./_components/transaction-header";
import { TransactionMoveRow } from "./_components/transaction-move-row.client";
import { TransactionOverflowMenu } from "./_components/transaction-overflow-menu.client";

export const metadata: Metadata = { title: "Lançamento" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  await requireUser();
  const { id } = await params;

  const txn = await fetchTransactionDetail(id);
  if (!txn) notFound();

  return (
    <PageShell backHref={"/app/lancamentos" as Route} backPreferFallback>
      <TransactionHeader
        txn={txn}
        action={
          <TransactionOverflowMenu
            transactionId={id}
            description={txn.description}
            scheduled={txn.status === "scheduled"}
          />
        }
      />
      <ActionRowGroup>
        <ActionRow
          icon={Pencil}
          title="Editar lançamento"
          href={`/app/lancamentos/${id}/editar` as Route}
        />
        <TransactionExcludeToggle transactionId={id} excluded={txn.excludedFromTotals} />
        <TransactionMoveRow
          transactionId={id}
          currentAccountId={txn.accountId}
          currentAccountLabel={txn.accountLabel}
        />
      </ActionRowGroup>
    </PageShell>
  );
}
