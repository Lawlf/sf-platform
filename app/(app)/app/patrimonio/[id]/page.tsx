import type { Route } from "next";
import { notFound } from "next/navigation";

import { fetchGoalsLinkedToAsset } from "@/app/(app)/app/metas/_actions/goal-queries";
import { getAssetDetail } from "@/application/use-cases/asset/get-asset-detail.use-case";
import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { monthlyDebtService } from "@/domain/services/financial-health.service";
import { projectFixedIncomeOneYear } from "@/domain/services/fixed-income-projection.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";
import { formatDateSafe } from "@/shared/format/date-format";
import { formatCents } from "@/shared/format/money-format";

import { EntityNotesAndFiles } from "../../_components/notes-files/entity-notes-and-files";
import { PageShell } from "../../_components/page-shell";
import { CarteiraBalanceCard } from "../_components/carteira-balance-card.client";

import {
  fetchAccountTransactionCount,
  fetchAccountTransactionsPage,
} from "./_actions/account-transactions-queries";
import { AccountTransactionsSection } from "./_components/account-transactions";
import type { AssetCostView } from "./_components/asset-cost-card";
import {
  AssetDetailView,
  type AvailableDebtView,
  type CashYieldView,
  type CryptoView,
  type LinkedDebtView,
  type PurchasePriceView,
  type StockView,
} from "./_components/asset-detail";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const DATETIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const PCT_FMT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await requireUser();
  const profileId = await getActiveProfileId();

  const detail = await getAssetDetail(
    {
      assets: repos.assets,
      allocations: repos.assetDebtAllocations,
      debts: repos.debts,
    },
    { profileId, assetId: id },
  );
  if (!isOk(detail)) notFound();

  const { asset, netWorth, linkedDebts } = detail.value;

  // A Carteira não é um bem comum: é a conta líquida reativa. Ela ganha tela
  // própria (saldo reativo + projeção + ajustar/ancorar + extrato), não o
  // detalhe genérico de bem (que traria "vincular dívida", "vendi ou saiu", etc).
  const isWallet = asset.category === "cash" && asset.label === "Carteira";

  const allDebtsResult = await listDebts(
    { debts: repos.debts },
    { profileId, status: "active" },
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

  const assetNoun =
    asset.category === "vehicle"
      ? "veículo"
      : asset.category === "real_estate"
        ? "imóvel"
        : asset.category === "investment"
          ? "investimento"
          : "bem";

  // Custo de propriedade: vem dos lançamentos ATRELADOS a este bem (assetId),
  // não de categorias inteiras. Atribuição direta evita o vazamento de "toda
  // transporte = este carro" quando há mais de um bem na mesma categoria.
  // Média de 3 meses, só BRL, ignora excluídos e não-pagos. Entradas atreladas
  // (ex.: aluguel) viram renda do bem.
  let monthlyExpensesCents = 0n;
  let monthlyIncomeCents = 0n;
  if (asset.category !== "cash") {
    const nowMonth = MonthYear.fromDate(new Date());
    const fromMonth = nowMonth.previous().previous();
    const txns = await repos.transactions.listForProfileInRange(
      profileId,
      fromMonth.firstDay(),
      nowMonth.lastDay(),
    );
    let outCents = 0n;
    let inCents = 0n;
    for (const t of txns) {
      if (t.assetId !== asset.id) continue;
      if (t.excludedFromTotals) continue;
      if (t.status !== "paid") continue;
      if (t.amount.currency !== "BRL") continue;
      if (t.direction === "out") outCents += t.amount.toCents();
      else inCents += t.amount.toCents();
    }
    monthlyExpensesCents = outCents / 3n;
    monthlyIncomeCents = inCents / 3n;
  }

  let costSummary: AssetCostView | null = null;
  if (
    asset.category !== "cash" &&
    (linkedDebts.length > 0 || monthlyExpensesCents > 0n || monthlyIncomeCents > 0n)
  ) {
    const cur = asset.currentValue.currency;
    const valueCents = asset.currentValue.toCents();
    const owedCents = valueCents - netWorth.toCents();
    let monthlyReais = 0;
    for (const l of linkedDebts) {
      const svc = monthlyDebtService(l.debt);
      if (!isOk(svc)) continue;
      const principalCents = l.debt.originalPrincipal.toCents();
      const frac =
        principalCents > 0n
          ? Number(l.allocationOriginal.toCents()) / Number(principalCents)
          : 1;
      monthlyReais += svc.value * frac;
    }
    const installmentCents = BigInt(Math.round(monthlyReais * 100));
    const totalCents = installmentCents + monthlyExpensesCents;
    const netCents = monthlyIncomeCents - totalCents;
    costSummary = {
      noun: assetNoun,
      hasDebt: linkedDebts.length > 0,
      valueFormatted: asset.currentValue.format(),
      owedFormatted: formatCents(owedCents < 0n ? -owedCents : owedCents, cur),
      ownFormatted: netWorth.format(),
      ownIsNegative: netWorth.isNegative(),
      owedPct: valueCents > 0n ? (Number(owedCents) / Number(valueCents)) * 100 : 100,
      monthlyTotalFormatted: totalCents > 0n ? formatCents(totalCents, cur) : null,
      monthlyInstallmentFormatted: installmentCents > 0n ? formatCents(installmentCents, cur) : null,
      monthlyExpensesFormatted:
        monthlyExpensesCents > 0n ? formatCents(monthlyExpensesCents, cur) : null,
      monthlyIncomeFormatted: monthlyIncomeCents > 0n ? formatCents(monthlyIncomeCents, cur) : null,
      netFormatted: monthlyIncomeCents > 0n ? formatCents(netCents < 0n ? -netCents : netCents, cur) : null,
      netIsPositive: netCents >= 0n,
    };
  }

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
      const deltaFormatted = `${sign}${formatCents(abs, asset.currentValue.currency)}`;
      let deltaPctFormatted: string | null = null;
      if (paid > 0n) {
        const pct = Number(delta) / Number(paid);
        deltaPctFormatted = PCT_FMT.format(pct);
      }
      purchasePrice = {
        paidFormatted: formatCents(paid, asset.currentValue.currency),
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
      gainLossFormatted = `${sign}${formatCents(abs, asset.currentValue.currency)}`;
      if (avgPriceCents > 0n) {
        const pct = Number(lastQuoteCents - avgPriceCents) / Number(avgPriceCents);
        gainLossPctFormatted = PCT_FMT.format(pct);
      }
    }

    stock = {
      ticker,
      shares,
      avgPriceFormatted: formatCents(avgPriceCents, asset.currentValue.currency),
      avgPriceCents: avgPriceCents.toString(),
      lastQuoteFormatted:
        lastQuoteCents !== null ? formatCents(lastQuoteCents, asset.currentValue.currency) : null,
      lastQuoteCents: lastQuoteCents !== null ? lastQuoteCents.toString() : null,
      lastQuoteAt: formatDateSafe(DATETIME_FMT, lastQuoteAt),
      gainLossFormatted,
      gainLossIsNegative,
      gainLossPctFormatted,
    };
  }

  let crypto: CryptoView | null = null;
  if (
    asset.category === "investment" &&
    asset.metadata &&
    asset.metadata.kind === "investment" &&
    asset.metadata.investmentType === "crypto" &&
    typeof asset.metadata.ticker === "string" &&
    asset.metadata.ticker.length > 0
  ) {
    const lastQuoteCents =
      typeof asset.metadata.lastQuoteCents === "bigint" ? asset.metadata.lastQuoteCents : null;
    const lastQuoteAt =
      asset.metadata.lastQuoteAt instanceof Date ? asset.metadata.lastQuoteAt : null;
    const qty = asset.metadata.shares ?? 0;
    crypto = {
      symbol: asset.metadata.ticker,
      quantityFormatted: qty.toLocaleString("pt-BR", { maximumFractionDigits: 8 }),
      lastQuoteFormatted:
        lastQuoteCents !== null ? formatCents(lastQuoteCents, asset.currentValue.currency) : null,
      lastQuoteAt: formatDateSafe(DATETIME_FMT, lastQuoteAt),
    };
  }

  let fixedIncomeProjection: { ratePct: string; oneYearFormatted: string } | null = null;
  if (
    asset.category === "investment" &&
    asset.metadata &&
    asset.metadata.kind === "investment" &&
    asset.metadata.investmentType === "fixed_income" &&
    typeof asset.metadata.annualRatePct === "number" &&
    asset.metadata.annualRatePct > 0
  ) {
    const projected = projectFixedIncomeOneYear(
      asset.currentValue.toCents(),
      asset.metadata.annualRatePct,
    );
    if (projected !== null) {
      fixedIncomeProjection = {
        ratePct: asset.metadata.annualRatePct.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
        oneYearFormatted: formatCents(projected, asset.currentValue.currency),
      };
    }
  }

  const linkedGoals = await fetchGoalsLinkedToAsset(id);

  const isCash = asset.category === "cash";
  const txnPreview = isCash
    ? await fetchAccountTransactionsPage({ accountId: asset.id, limit: 3 })
    : null;
  const txnTotal = isCash ? await fetchAccountTransactionCount(asset.id) : 0;
  const txnFraming: "extrato" | "lancamentos" = asset.externalAccountKey
    ? "extrato"
    : "lancamentos";

  // Carteira: tela própria. Saldo reativo + projeção + ajustar/ancorar
  // (CarteiraBalanceCard, mesmo do dashboard) + extrato. Sem detalhe de bem.
  if (isWallet) {
    return (
      <PageShell title="Carteira" backHref={"/app/patrimonio" as Route}>
        <CarteiraBalanceCard asDetail />
        <AccountTransactionsSection
          accountId={asset.id}
          items={txnPreview?.items ?? []}
          total={txnTotal}
          framing={txnFraming}
          seeAllHref="/app/lancamentos"
        />
      </PageShell>
    );
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
      acquiredAtFormatted: formatDateSafe(DATE_FMT, asset.acquiredAt),
    };
  }

  return (
    <PageShell title="Detalhe do bem" backHref={"/app/patrimonio" as Route}>
      <AssetDetailView
        assetId={asset.id}
        label={asset.label}
        category={asset.category}
        currentValueFormatted={asset.currentValue.format()}
        currentValueCents={asset.currentValue.toCents().toString()}
        currency={asset.currentValue.currency}
        netWorthFormatted={netWorth.format()}
        netWorthIsNegative={netWorth.isNegative()}
        netWorthDiffersFromValue={!netWorth.equals(asset.currentValue)}
        fipeCode={asset.fipeCode}
        fipeLastSyncedAt={formatDateSafe(DATE_FMT, asset.fipeLastSyncedAt)}
        linkedDebts={linkedView}
        availableDebts={availableDebts}
        cashYield={cashYield}
        stock={stock}
        crypto={crypto}
        fixedIncomeProjection={fixedIncomeProjection}
        purchasePrice={purchasePrice}
        isPro={user.isPro}
        description={description}
        depreciation={depreciation}
        linkedGoals={linkedGoals}
        costSummary={costSummary}
      />
      {isCash ? (
        <AccountTransactionsSection
          accountId={asset.id}
          items={txnPreview?.items ?? []}
          total={txnTotal}
          framing={txnFraming}
        />
      ) : null}

      <EntityNotesAndFiles
        entityType="account"
        entityId={asset.id}
        userId={user.id}
        isPro={user.isPro}
      />
    </PageShell>
  );
}
