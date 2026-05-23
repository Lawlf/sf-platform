import type { Route } from "next";
import { notFound } from "next/navigation";

import { getAssetDetail } from "@/application/use-cases/asset/get-asset-detail.use-case";
import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

import { PageShell } from "../../_components/page-shell";

import {
  AssetDetailView,
  type AvailableDebtView,
  type CashYieldView,
  type LinkedDebtView,
  type PurchasePriceView,
  type StockView,
} from "./_components/asset-detail";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const DATETIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const BRL_FMT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});
const PCT_FMT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCentsBRL(cents: bigint): string {
  return BRL_FMT.format(Number(cents) / 100);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await requireUser();

  const detail = await getAssetDetail(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: new DrizzleDebtRepository(),
    },
    { userId: user.id, assetId: id },
  );
  if (!isOk(detail)) notFound();

  const { asset, netWorth, linkedDebts } = detail.value;

  const allDebtsResult = await listDebts(
    { debts: new DrizzleDebtRepository() },
    { userId: user.id, status: "active" },
  );
  const allActiveDebts = isOk(allDebtsResult) ? allDebtsResult.value : [];

  const linkedIds = new Set(linkedDebts.map((l) => l.debt.id));
  const availableDebts: AvailableDebtView[] = allActiveDebts
    .filter((d) => !linkedIds.has(d.id))
    .map((d) => ({
      debtId: d.id,
      label: d.label,
      originalPrincipalFormatted: d.originalPrincipal.format(),
      originalPrincipalCents: d.originalPrincipal.toCents().toString(),
    }));

  const linkedView: LinkedDebtView[] = linkedDebts.map((l) => ({
    debtId: l.debt.id,
    label: l.debt.label,
    allocationOriginalFormatted: l.allocationOriginal.format(),
    outstandingOnAssetFormatted: l.outstandingOnAsset.format(),
  }));

  let cashYield: CashYieldView | null = null;
  if (asset.category === "cash" && asset.metadata && asset.metadata.kind === "cash") {
    cashYield = {
      yieldType: asset.metadata.yieldType ?? "none",
      yieldRatePct:
        typeof asset.metadata.yieldRatePct === "number" ? asset.metadata.yieldRatePct : null,
    };
  }

  // Pagou vs Vale agora (delta). Skip for stocks: o cálculo equivalente já
  // aparece na seção de Ação via avgPrice/lastQuote. Para os demais, usamos
  // o `purchasePriceCents` do asset (quando o usuário preencheu).
  let purchasePrice: PurchasePriceView | null = null;
  if (asset.purchasePriceCents !== null && asset.purchasePriceCents > 0n) {
    const isStock =
      asset.category === "investment" &&
      asset.metadata !== null &&
      asset.metadata.kind === "investment" &&
      asset.metadata.investmentType === "stocks";
    if (!isStock) {
      const paid = asset.purchasePriceCents;
      const current = asset.currentValue.toCents();
      const delta = current - paid;
      const isNegative = delta < 0n;
      const abs = isNegative ? -delta : delta;
      const sign = isNegative ? "-" : "+";
      const deltaFormatted = `${sign}${formatCentsBRL(abs)}`;
      let deltaPctFormatted: string | null = null;
      if (paid > 0n) {
        const pct = Number(delta) / Number(paid);
        deltaPctFormatted = PCT_FMT.format(pct);
      }
      purchasePrice = {
        paidFormatted: formatCentsBRL(paid),
        currentFormatted: asset.currentValue.format(),
        deltaFormatted,
        deltaPctFormatted,
        isNegative,
      };
    }
  }

  let stock: StockView | null = null;
  if (
    asset.category === "investment" &&
    asset.metadata &&
    asset.metadata.kind === "investment" &&
    asset.metadata.investmentType === "stocks" &&
    typeof asset.metadata.ticker === "string" &&
    asset.metadata.ticker.length > 0
  ) {
    const ticker = asset.metadata.ticker;
    const shares = asset.metadata.shares ?? 0;
    const avgPriceCents =
      typeof asset.metadata.avgPriceCents === "bigint" ? asset.metadata.avgPriceCents : 0n;
    const lastQuoteCents =
      typeof asset.metadata.lastQuoteCents === "bigint" ? asset.metadata.lastQuoteCents : null;
    const lastQuoteAt =
      asset.metadata.lastQuoteAt instanceof Date ? asset.metadata.lastQuoteAt : null;

    let gainLossFormatted: string | null = null;
    let gainLossIsNegative = false;
    let gainLossPctFormatted: string | null = null;
    if (lastQuoteCents !== null && shares > 0) {
      const diffCents = (lastQuoteCents - avgPriceCents) * BigInt(shares);
      gainLossIsNegative = diffCents < 0n;
      const abs = diffCents < 0n ? -diffCents : diffCents;
      const sign = diffCents < 0n ? "-" : "+";
      gainLossFormatted = `${sign}${formatCentsBRL(abs)}`;
      if (avgPriceCents > 0n) {
        const pct = Number(lastQuoteCents - avgPriceCents) / Number(avgPriceCents);
        gainLossPctFormatted = PCT_FMT.format(pct);
      }
    }

    stock = {
      ticker,
      shares,
      avgPriceFormatted: formatCentsBRL(avgPriceCents),
      avgPriceCents: avgPriceCents.toString(),
      lastQuoteFormatted: lastQuoteCents !== null ? formatCentsBRL(lastQuoteCents) : null,
      lastQuoteCents: lastQuoteCents !== null ? lastQuoteCents.toString() : null,
      lastQuoteAt: lastQuoteAt ? DATETIME_FMT.format(lastQuoteAt) : null,
      gainLossFormatted,
      gainLossIsNegative,
      gainLossPctFormatted,
    };
  }

  // Description (apenas para categoria "other" com metadata.description).
  let description: string | null = null;
  if (
    asset.category === "other" &&
    asset.metadata !== null &&
    asset.metadata.kind === "other" &&
    typeof asset.metadata.description === "string" &&
    asset.metadata.description.trim().length > 0
  ) {
    description = asset.metadata.description;
  }

  // Comportamento do valor (depreciation): só relevante quando não é cash/investment.
  const DEPRECIATION_LABEL: Record<string, string> = {
    appreciating: "Aprecia",
    stable: "Estável",
    depreciating: "Deprecia",
    consumable: "Consumível",
  };
  let depreciation: {
    kindLabel: string;
    ratePctYear: number;
    acquiredAtFormatted: string | null;
  } | null = null;
  if (asset.category !== "cash" && asset.category !== "investment") {
    depreciation = {
      kindLabel: DEPRECIATION_LABEL[asset.depreciationKind] ?? asset.depreciationKind,
      ratePctYear: asset.depreciationRatePctYear,
      acquiredAtFormatted: asset.acquiredAt ? DATE_FMT.format(asset.acquiredAt) : null,
    };
  }

  return (
    <PageShell title="Ativo" backHref={"/app/patrimonio" as Route}>
      <AssetDetailView
        assetId={asset.id}
        label={asset.label}
        category={asset.category}
        currentValueFormatted={asset.currentValue.format()}
        currentValueCents={asset.currentValue.toCents().toString()}
        netWorthFormatted={netWorth.format()}
        netWorthIsNegative={netWorth.isNegative()}
        fipeCode={asset.fipeCode}
        fipeLastSyncedAt={asset.fipeLastSyncedAt ? DATE_FMT.format(asset.fipeLastSyncedAt) : null}
        linkedDebts={linkedView}
        availableDebts={availableDebts}
        cashYield={cashYield}
        stock={stock}
        purchasePrice={purchasePrice}
        isPro={user.isPro}
        description={description}
        depreciation={depreciation}
      />
    </PageShell>
  );
}
