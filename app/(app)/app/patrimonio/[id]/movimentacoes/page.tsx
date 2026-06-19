import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { getAssetDetail } from "@/application/use-cases/asset/get-asset-detail.use-case";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../../../_components/page-shell";
import {
  fetchAccountMonthSummaries,
  fetchAccountTransactionsPage,
} from "../_actions/account-transactions-queries";

import { AccountMovementsView } from "./_components/account-movements-view.client";

export const metadata: Metadata = { title: "Movimentações" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountMovementsPage({ params }: PageProps) {
  const { id } = await params;
  const [user, profileId] = await Promise.all([requireUser(), getActiveProfileId()]);

  const detail = await getAssetDetail(
    {
      assets: repos.assets,
      allocations: repos.assetDebtAllocations,
      debts: repos.debts,
    },
    { profileId, assetId: id },
  );
  if (!isOk(detail)) notFound();

  const { asset } = detail.value;
  if (asset.category !== "cash") notFound();

  const framing: "extrato" | "lancamentos" = asset.externalAccountKey ? "extrato" : "lancamentos";
  const [initialPage, monthSummaries] = await Promise.all([
    fetchAccountTransactionsPage({ accountId: id, limit: 30 }),
    fetchAccountMonthSummaries(id),
  ]);

  return (
    <PageShell
      title="Movimentações"
      description={asset.label}
      backHref={`/app/patrimonio/${id}` as Route}
    >
      <AccountMovementsView
        accountId={id}
        framing={framing}
        initialPage={initialPage}
        monthSummaries={monthSummaries}
      />
    </PageShell>
  );
}
