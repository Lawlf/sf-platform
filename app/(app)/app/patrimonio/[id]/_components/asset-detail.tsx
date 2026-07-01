"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Calculator,
  Car,
  Coins,
  FileText,
  Home,
  Link2,
  PackageX,
  Pencil,
  Receipt,
  RefreshCw,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
import type { SerializedGoalWithProgress } from "@/app/(app)/app/metas/_actions/goal-queries";
import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { Spinner } from "@/app/components/ui/spinner";
import { SimpleTooltip } from "@/app/components/ui/tooltip";
import type { Currency } from "@/domain/value-objects/money.vo";

import { ActionRow, ActionRowGroup } from "../../../_components/action-row";
import { HowItWorksSheet } from "../../../_components/how-it-works-sheet";
import { wizardInputClass } from "@/ui/wizard-field";
import { WizardMoneyField } from "@/ui/wizard-money-field";
import { WizardRadioCard } from "@/ui/wizard-radio-card";
import { buildGoalSeedQuery } from "../../../simular/_lib/goal-seed";
import { invalidateAssetCaches } from "../../_lib/invalidate";
import { deactivateAssetAction } from "../_actions/deactivate-asset.action";
import { linkDebtAction } from "../_actions/link-debt.action";
import { refreshCryptoQuoteAction } from "../_actions/refresh-crypto-quote.action";
import { refreshFipeAction } from "../_actions/refresh-fipe.action";
import { refreshStockQuoteAction } from "../_actions/refresh-stock-quote.action";
import { unlinkDebtAction } from "../_actions/unlink-debt.action";
import { updateAssetAction } from "../_actions/update-asset.action";

import { AssetCostCard, type AssetCostView } from "./asset-cost-card";
import { DeleteAssetButton } from "./delete-asset-button";

export interface LinkedDebtView {
  debtId: string;
  label: string;
  allocationOriginalFormatted: string;
  outstandingOnAssetFormatted: string;
}

export interface AvailableDebtView {
  debtId: string;
  label: string;
  originalPrincipalFormatted: string;
  originalPrincipalCents: string;
}

export interface CashYieldView {
  yieldType: "none" | "cdi" | "fixed_pct_year";
  yieldRatePct: number | null;
}

export interface StockView {
  ticker: string;
  shares: number;
  avgPriceFormatted: string;
  avgPriceCents: string;
  lastQuoteFormatted: string | null;
  lastQuoteCents: string | null;
  lastQuoteAt: string | null;
  gainLossFormatted: string | null;
  gainLossIsNegative: boolean;
  gainLossPctFormatted: string | null;
}

export interface CryptoView {
  symbol: string;
  quantityFormatted: string;
  lastQuoteFormatted: string | null;
  lastQuoteAt: string | null;
}

export interface PurchasePriceView {
  /** Formatted "R$ X" of what the user paid. */
  paidFormatted: string;
  /** Formatted "R$ Y" of current value (mirrored for layout convenience). */
  currentFormatted: string;
  /** Formatted signed delta, e.g. "+R$ 1.200,00" or "-R$ 350,00". */
  deltaFormatted: string;
  /** Formatted signed percent change, e.g. "+5,00%". May be null when paid=0. */
  deltaPctFormatted: string | null;
  /** True when delta is negative (UI uses red color in that case). */
  isNegative: boolean;
}

export interface AssetDetailViewProps {
  assetId: string;
  label: string;
  category: "vehicle" | "real_estate" | "investment" | "cash" | "other";
  currentValueFormatted: string;
  currentValueCents: string;
  currency: Currency;
  netWorthFormatted: string;
  netWorthIsNegative: boolean;
  netWorthDiffersFromValue: boolean;
  fipeCode: string | null;
  fipeLastSyncedAt: string | null;
  linkedDebts: LinkedDebtView[];
  availableDebts: AvailableDebtView[];
  cashYield: CashYieldView | null;
  stock: StockView | null;
  crypto: CryptoView | null;
  fixedIncomeProjection: { ratePct: string; oneYearFormatted: string } | null;
  /**
   * Comparação Pagou vs Vale agora. Não passada para ações (stocks já têm
   * sua própria seção de ganho/perda via avgPrice). `null` quando o usuário
   * não preencheu o preço de compra.
   */
  purchasePrice: PurchasePriceView | null;
  isPro: boolean;
  /** Texto livre da descrição (categoria "other"). null quando vazio. */
  description: string | null;
  /** Comportamento de depreciação/apreciação do ativo. null quando não aplica (cash/investment). */
  depreciation: {
    kind: "appreciating" | "stable" | "depreciating" | "consumable";
    kindLabel: string;
    ratePctYear: number;
    acquiredAtFormatted: string | null;
    acquiredAtIso: string | null;
  } | null;
  /** Metas vinculadas a este ativo. */
  linkedGoals: SerializedGoalWithProgress[];
  /** Dossiê de custo total (vale x devo + parcela). null quando não tem estrutura (sem dívida ligada). */
  costSummary: AssetCostView | null;
}

function formatCentsToBRL(cents: bigint): string {
  const reais = Number(cents) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatRatePct(rate: number): string {
  return rate.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function formatCashYield(cashYield: CashYieldView): string | null {
  if (cashYield.yieldType === "none") return null;
  const rate = cashYield.yieldRatePct;
  if (rate === null || !Number.isFinite(rate) || rate <= 0) return null;
  if (cashYield.yieldType === "cdi") return `Rende ${formatRatePct(rate)}% do CDI`;
  return `Rende ${formatRatePct(rate)}% ao ano`;
}

function categoryLabel(category: AssetDetailViewProps["category"]): string {
  if (category === "vehicle") return "Veículo";
  if (category === "real_estate") return "Imóvel";
  if (category === "investment") return "Investimento";
  if (category === "cash") return "Reserva";
  return "Outro";
}

function categoryIcon(category: AssetDetailViewProps["category"], size = 20) {
  if (category === "vehicle") return <Car size={size} strokeWidth={1.75} aria-hidden />;
  if (category === "real_estate") return <Home size={size} strokeWidth={1.75} aria-hidden />;
  if (category === "investment") return <TrendingUp size={size} strokeWidth={1.75} aria-hidden />;
  if (category === "cash") return <Wallet size={size} strokeWidth={1.75} aria-hidden />;
  return <Box size={size} strokeWidth={1.75} aria-hidden />;
}

export function AssetDetailView(props: AssetDetailViewProps) {
  const [editOpen, setEditOpen] = useState(false);
  const nwColor = props.netWorthIsNegative
    ? "text-[color:var(--semantic-negative)]"
    : "text-[color:var(--semantic-positive)]";

  const goalSeedHref = `/app/metas/nova?${buildGoalSeedQuery({
    type: "savings",
    targetCents: "0",
    savedCents: "0",
    deadlineIso: null,
    fundingMode: "linked",
    linkedAssetId: props.assetId,
  })}` as Route;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[color:var(--text-muted)]">
              <span className="text-[color:var(--color-brand-700)]" aria-hidden>
                {categoryIcon(props.category, 13)}
              </span>
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide">
                {categoryLabel(props.category)}
              </span>
            </div>
            <h1
              className="mt-1 text-[1.5rem] font-extrabold leading-tight text-[color:var(--text-primary)]"
              style={{ letterSpacing: "-0.4px" }}
            >
              {props.label}
            </h1>
            {props.description ? (
              <p className="mt-1 whitespace-pre-line text-[0.8125rem] text-[color:var(--text-secondary)]">
                {props.description}
              </p>
            ) : null}
          </div>
          <AssetOptionsMenu
            assetId={props.assetId}
            label={props.label}
            category={props.category}
            onEdit={() => setEditOpen(true)}
          />
        </div>
        <div
          className={`mt-4 grid gap-3 border-t border-[color:var(--border-soft)] pt-3 text-sm ${
            props.netWorthDiffersFromValue ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          <div>
            <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              {props.netWorthDiffersFromValue ? "Vale" : "Valor atual"}
            </div>
            <div className="mt-0.5 font-bold text-[color:var(--text-primary)]">
              <HideableValue>{props.currentValueFormatted}</HideableValue>
            </div>
          </div>
          {props.netWorthDiffersFromValue ? (
            <div>
              <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                Seu, livre da dívida
              </div>
              <div className={`mt-0.5 font-bold ${nwColor}`}>
                <HideableValue>{props.netWorthFormatted}</HideableValue>
              </div>
            </div>
          ) : null}
        </div>

        {props.purchasePrice &&
        props.purchasePrice.paidFormatted !== props.purchasePrice.currentFormatted ? (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[color:var(--border-soft)] pt-3 text-sm">
            <div>
              <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                Pagou
              </div>
              <div className="mt-0.5 font-bold text-[color:var(--text-primary)]">
                <HideableValue>{props.purchasePrice.paidFormatted}</HideableValue>
              </div>
            </div>
            <div>
              <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                {props.purchasePrice.isNegative ? "Quanto caiu" : "Quanto rendeu"}
              </div>
              <div
                className={`mt-0.5 flex items-center gap-1 font-bold ${
                  props.purchasePrice.isNegative
                    ? "text-[color:var(--semantic-negative)]"
                    : "text-[color:var(--semantic-positive)]"
                }`}
              >
                {props.purchasePrice.isNegative ? (
                  <TrendingDown size={12} strokeWidth={2.25} aria-hidden className="shrink-0" />
                ) : (
                  <TrendingUp size={12} strokeWidth={2.25} aria-hidden className="shrink-0" />
                )}
                <HideableValue>{props.purchasePrice.deltaFormatted}</HideableValue>
                {props.purchasePrice.deltaPctFormatted ? (
                  <span className="text-[0.6875rem] opacity-80">
                    ({props.purchasePrice.deltaPctFormatted})
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <EditAssetHeaderSheet
        assetId={props.assetId}
        label={props.label}
        currentValueCents={props.currentValueCents}
        currency={props.currency}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {props.category === "investment" && props.stock ? (
        <StockSummarySection assetId={props.assetId} stock={props.stock} isPro={props.isPro} />
      ) : null}

      {props.crypto ? (
        <CryptoSummarySection assetId={props.assetId} crypto={props.crypto} isPro={props.isPro} />
      ) : null}

      <ActionRowGroup>
        <ActionRow icon={Pencil} title="Editar" onClick={() => setEditOpen(true)} />
        <ActionRow
          icon={FileText}
          title="Documentos e anotações"
          href={`/app/patrimonio/${props.assetId}/anotacoes` as Route}
        />
        {props.costSummary ? <AssetCostRow view={props.costSummary} /> : null}
        <ActionRow
          icon={Calculator}
          title="Simuladores"
          href={"/app/simular?category=patrimonio" as Route}
        />
        {props.linkedDebts.length === 0 ? (
          <LinkDebtEntryRow
            assetId={props.assetId}
            assetLabel={props.label}
            availableDebts={props.availableDebts}
          />
        ) : null}
        {props.linkedGoals.length === 0 ? (
          <ActionRow icon={Target} title="Criar meta com este bem" href={goalSeedHref} />
        ) : null}
      </ActionRowGroup>

      {props.depreciation ? (
        <DepreciationSection assetId={props.assetId} view={props.depreciation} />
      ) : null}

      {props.category === "cash" && props.cashYield ? (
        <CashYieldSection cashYield={props.cashYield} />
      ) : null}

      {props.category === "vehicle" && props.fipeCode ? (
        <RefreshFipeSection
          assetId={props.assetId}
          fipeCode={props.fipeCode}
          fipeLastSyncedAt={props.fipeLastSyncedAt}
        />
      ) : null}

      {props.fixedIncomeProjection ? (
        <FixedIncomeProjectionSection projection={props.fixedIncomeProjection} />
      ) : null}

      {props.linkedDebts.length > 0 ? (
        <>
          <LinkedDebtsSection assetId={props.assetId} linkedDebts={props.linkedDebts} />
          <LinkMoreDebtRow
            assetId={props.assetId}
            assetLabel={props.label}
            availableDebts={props.availableDebts}
          />
        </>
      ) : null}

      {props.linkedGoals.length > 0 ? (
        <section className="flex flex-col">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">
              Metas vinculadas
            </h2>
            <Link
              href={goalSeedHref}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
            >
              Criar outra meta
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {props.linkedGoals.map((g) => (
              <li key={g.goal.id}>
                <Link
                  href={`/app/metas/${g.goal.id}` as Route}
                  className="flex items-center justify-between rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.8125rem] hover:bg-[color:var(--surface-1)]"
                >
                  <span className="font-medium text-[color:var(--text-primary)]">
                    {g.goal.title}
                  </span>
                  <span className="text-[color:var(--text-muted)]">{g.progress.pct}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

interface EditAssetHeaderFormValues {
  currentValueCents: bigint;
}

function EditAssetHeaderSheet({
  assetId,
  label,
  currentValueCents,
  currency,
  open,
  onOpenChange,
}: {
  assetId: string;
  label: string;
  currentValueCents: string;
  currency: Currency;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(label);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EditAssetHeaderFormValues>({
    defaultValues: { currentValueCents: BigInt(currentValueCents) },
  });

  function reset() {
    setName(label);
    setError(null);
    form.reset({ currentValueCents: BigInt(currentValueCents) });
  }

  function onSave() {
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setError("O nome deve ter entre 1 e 120 caracteres.");
      return;
    }
    const cents = form.getValues("currentValueCents");
    if (typeof cents !== "bigint" || cents < 0n) {
      setError("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const r = await updateAssetAction({
        assetId,
        label: trimmed,
        currentValueCents: cents.toString(),
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await invalidateAssetCaches(queryClient);
      onOpenChange(false);
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Editar bem</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
            Nome
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Nome do bem"
            className={wizardInputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
            Valor atual
          </label>
          <WizardMoneyField
            control={form.control}
            name="currentValueCents"
            placeholder="R$ 0,00"
            currency={currency}
          />
        </div>

        {error ? (
          <span role="alert" className="text-[0.75rem] text-[color:var(--semantic-negative)]">
            {error}
          </span>
        ) : null}

        <Button type="button" onClick={onSave} loading={pending}>
          Salvar
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function AssetCostRow({ view }: { view: AssetCostView }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionRow
        icon={Receipt}
        title={`O que esse ${view.noun} representa`}
        onClick={() => setOpen(true)}
        {...(view.monthlyTotalFormatted
          ? { subtitle: `Sai ${view.monthlyTotalFormatted}/mês` }
          : {})}
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{`O que esse ${view.noun} representa`}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <AssetCostCard view={view} bare />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CashYieldSection({ cashYield }: { cashYield: CashYieldView }) {
  const text = formatCashYield(cashYield);
  if (text === null) return null;
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Rendimento</h2>
      <p className="mt-2 text-[0.8125rem] text-[color:var(--text-primary)] opacity-80">{text}</p>
    </section>
  );
}

function StockSummarySection({
  assetId,
  stock,
  isPro,
}: {
  assetId: string;
  stock: StockView;
  isPro: boolean;
}) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onRefresh() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const r = await refreshStockQuoteAction({ assetId });
      if (!r.ok) {
        setError(r.message ?? "Não foi possível atualizar a cotação.");
      } else {
        setSuccess(`Cotação de ${r.data.symbol} atualizada.`);
        await invalidateAssetCaches(queryClient);
      }
    });
  }

  const gainLossColor = stock.gainLossIsNegative
    ? "text-[color:var(--semantic-negative)]"
    : "text-[color:var(--semantic-positive)]";
  const TrendIcon = stock.gainLossIsNegative ? TrendingDown : TrendingUp;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
              {stock.ticker}
            </span>
            <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
              {stock.shares} {stock.shares === 1 ? "ação" : "ações"} · médio{" "}
              <HideableValue>{stock.avgPriceFormatted}</HideableValue>
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
            <span className="text-[1.25rem] font-extrabold text-[color:var(--text-primary)]">
              {stock.lastQuoteFormatted ? (
                <HideableValue>{stock.lastQuoteFormatted}</HideableValue>
              ) : (
                "Sem cotação ainda"
              )}
            </span>
            {stock.gainLossFormatted ? (
              <span
                className={`flex items-center gap-1 text-[0.8125rem] font-semibold ${gainLossColor}`}
              >
                <TrendIcon size={13} strokeWidth={2.25} aria-hidden />
                <HideableValue>{stock.gainLossFormatted}</HideableValue>
                {stock.gainLossPctFormatted ? (
                  <span className="text-[0.75rem] opacity-80">({stock.gainLossPctFormatted})</span>
                ) : null}
              </span>
            ) : null}
          </div>
          {stock.lastQuoteAt ? (
            <p className="mt-0.5 text-[0.625rem] text-[color:var(--text-muted)]">
              Atualizado {stock.lastQuoteAt}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <HowItWorksSheet topic="acoes" variant="brand" />
          <SimpleTooltip label="Atualizar cotação">
            <button
              type="button"
              aria-label="Atualizar cotação"
              onClick={onRefresh}
              disabled={pending}
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
            >
              {pending ? (
                <Spinner size={16} decorative />
              ) : (
                <RefreshCw size={16} strokeWidth={2} aria-hidden />
              )}
            </button>
          </SimpleTooltip>
        </div>
      </div>

      {error ? (
        <span
          role="alert"
          className="mt-2 block text-[0.6875rem] text-[color:var(--semantic-negative)]"
        >
          {error}
        </span>
      ) : null}
      {success ? (
        <span className="mt-2 block text-[0.6875rem] text-[color:var(--semantic-positive)]">
          {success}
        </span>
      ) : null}
      {!isPro ? (
        <p className="mt-2 text-[0.625rem] text-[color:var(--text-muted)]">
          No Pro, a gente atualiza essa cotação todo dia pra você.
        </p>
      ) : null}
    </section>
  );
}

function CryptoSummarySection({
  assetId,
  crypto,
  isPro,
}: {
  assetId: string;
  crypto: CryptoView;
  isPro: boolean;
}) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nudgeOpen, setNudgeOpen] = useState(false);

  function onRefresh() {
    if (!isPro) {
      setNudgeOpen(true);
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const r = await refreshCryptoQuoteAction({ assetId });
      if (!r.ok) {
        setError(r.message ?? "Não foi possível atualizar o preço.");
      } else {
        setSuccess(`Preço de ${r.data.symbol} atualizado.`);
        await invalidateAssetCaches(queryClient);
      }
    });
  }

  const updatedLabel = crypto.lastQuoteAt
    ? isPro
      ? `Atualizado ${crypto.lastQuoteAt}`
      : `Você atualizou em ${crypto.lastQuoteAt}`
    : null;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[0.6875rem] text-[color:var(--text-muted)]">
            <Coins size={13} strokeWidth={2} aria-hidden />
            {crypto.quantityFormatted} {crypto.symbol}
          </div>
          <div className="mt-1 text-[1.25rem] font-extrabold text-[color:var(--text-primary)]">
            {crypto.lastQuoteFormatted ? (
              <>
                <HideableValue>{crypto.lastQuoteFormatted}</HideableValue>{" "}
                <span className="text-[0.75rem] font-normal text-[color:var(--text-muted)]">
                  cada hoje
                </span>
              </>
            ) : (
              "Sem preço ainda"
            )}
          </div>
          {updatedLabel ? (
            <p className="mt-0.5 text-[0.625rem] text-[color:var(--text-muted)]">{updatedLabel}</p>
          ) : null}
        </div>

        <SimpleTooltip label="Atualizar preço">
          <button
            type="button"
            aria-label="Atualizar preço"
            onClick={onRefresh}
            disabled={pending}
            className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
          >
            {pending ? (
              <Spinner size={16} decorative />
            ) : (
              <RefreshCw size={16} strokeWidth={2} aria-hidden />
            )}
          </button>
        </SimpleTooltip>
      </div>

      {error ? (
        <span
          role="alert"
          className="mt-2 block text-[0.6875rem] text-[color:var(--semantic-negative)]"
        >
          {error}
        </span>
      ) : null}
      {success ? (
        <span className="mt-2 block text-[0.6875rem] text-[color:var(--semantic-positive)]">
          {success}
        </span>
      ) : null}
      {!isPro ? (
        <p className="mt-2 text-[0.625rem] text-[color:var(--text-muted)]">
          No Pro, a gente atualiza esse preço todo dia pra você.
        </p>
      ) : null}

      <Sheet open={nudgeOpen} onOpenChange={setNudgeOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Deixa o preço se atualizar sozinho</SheetTitle>
            <SheetDescription>
              O preço da cripto muda toda hora. No Pro, a gente atualiza pra você todo dia, sem você
              precisar lembrar.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Link
              href={"/app/configuracoes/planos" as Route}
              className="focus-ring inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)] px-4 text-[0.8125rem] font-semibold text-white"
            >
              Conhecer o Pro
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function FixedIncomeProjectionSection({
  projection,
}: {
  projection: { ratePct: string; oneYearFormatted: string };
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Projeção</h2>
      <p className="mt-2 text-[0.8125rem] text-[color:var(--text-primary)] opacity-80">
        No ritmo de {projection.ratePct}% ao ano, em 1 ano você teria cerca de{" "}
        <span className="font-semibold">
          <HideableValue>{projection.oneYearFormatted}</HideableValue>
        </span>
        .
      </p>
      <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
        Estimativa no ritmo atual. O valor real depende da taxa que continuar valendo.
      </p>
    </section>
  );
}

function RefreshFipeSection({
  assetId,
  fipeCode,
  fipeLastSyncedAt,
}: {
  assetId: string;
  fipeCode: string;
  fipeLastSyncedAt: string | null;
}) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onClick() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const r = await refreshFipeAction({ assetId });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setSuccess("Valor atualizado a partir da FIPE.");
      await invalidateAssetCaches(queryClient);
    });
  }

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Tabela FIPE</h2>
          <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
            Código: {fipeCode}
            {fipeLastSyncedAt ? ` · última atualização ${fipeLastSyncedAt}` : ""}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClick} loading={pending}>
          <RefreshCw size={14} strokeWidth={2} aria-hidden />
          Atualizar FIPE
        </Button>
      </div>
      {error ? (
        <span
          role="alert"
          className="mt-2 block text-[0.6875rem] text-[color:var(--semantic-negative)]"
        >
          {error}
        </span>
      ) : null}
      {success ? (
        <span className="mt-2 block text-[0.6875rem] text-[color:var(--semantic-positive)]">
          {success}
        </span>
      ) : null}
    </section>
  );
}

function LinkedDebtsSection({
  assetId,
  linkedDebts,
}: {
  assetId: string;
  linkedDebts: LinkedDebtView[];
}) {
  if (linkedDebts.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col">
      <h2 className="px-1 text-sm font-semibold text-[color:var(--text-primary)]">
        Dívidas vinculadas
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {linkedDebts.map((d) => (
          <LinkedDebtRow key={d.debtId} assetId={assetId} debt={d} />
        ))}
      </ul>
    </section>
  );
}

function LinkedDebtRow({ assetId, debt }: { assetId: string; debt: LinkedDebtView }) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onUnlink() {
    setError(null);
    startTransition(async () => {
      const r = await unlinkDebtAction({ assetId, debtId: debt.debtId });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await invalidateAssetCaches(queryClient);
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
          {debt.label}
        </p>
        <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
          Original: <HideableValue>{debt.allocationOriginalFormatted}</HideableValue> · Saldo no
          ativo: <HideableValue>{debt.outstandingOnAssetFormatted}</HideableValue>
        </p>
        {error ? (
          <span
            role="alert"
            className="mt-1 block text-[0.6875rem] text-[color:var(--semantic-negative)]"
          >
            {error}
          </span>
        ) : null}
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={onUnlink} loading={pending}>
        Desvincular
      </Button>
    </li>
  );
}

interface LinkDebtFormValues {
  allocationCents: bigint;
}

function LinkDebtSheet({
  assetId,
  assetLabel,
  availableDebts,
  open,
  onOpenChange,
}: {
  assetId: string;
  assetLabel: string;
  availableDebts: AvailableDebtView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LinkDebtFormValues>({
    defaultValues: { allocationCents: 0n as unknown as bigint },
  });

  const hasAvailable = availableDebts.length > 0;
  const selected = availableDebts.find((d) => d.debtId === selectedId) ?? null;

  function selectDebt(d: AvailableDebtView) {
    setSelectedId(d.debtId);
    setError(null);
    form.setValue("allocationCents", BigInt(d.originalPrincipalCents));
  }

  function changeOpen(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setSelectedId(null);
      setError(null);
      form.reset({ allocationCents: 0n as unknown as bigint });
    }
  }

  function goCreate() {
    router.push(`/app/dividas/nova?linkAssetId=${assetId}` as Route);
  }

  function onLink() {
    if (!selected) return;
    setError(null);
    const cents = form.getValues("allocationCents");
    if (typeof cents !== "bigint" || cents <= 0n) {
      setError("Informe um valor.");
      return;
    }
    const principal = BigInt(selected.originalPrincipalCents);
    if (cents > principal) {
      setError(`Acima do valor original (${formatCentsToBRL(principal)}).`);
      return;
    }
    startTransition(async () => {
      const r = await linkDebtAction({
        assetId,
        debtId: selected.debtId,
        allocationOriginalCents: cents.toString(),
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await invalidateAssetCaches(queryClient);
      changeOpen(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Vincular dívida a {assetLabel}</SheetTitle>
          <SheetDescription>
            Escolha uma dívida que você já cadastrou ou crie uma nova.
          </SheetDescription>
        </SheetHeader>

        {hasAvailable ? (
          <div className="flex flex-col gap-2">
            {availableDebts.map((d) => {
              const isSel = selectedId === d.debtId;
              return (
                <div
                  key={d.debtId}
                  className={`rounded-xl border-[1.5px] p-3 transition-colors ${
                    isSel
                      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.12]"
                      : "border-[color:var(--border-soft)] bg-[color:var(--surface-2)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectDebt(d)}
                    aria-pressed={isSel}
                    className="flex w-full items-start justify-between gap-2 text-left focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                        {d.label}
                      </div>
                      <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
                        <HideableValue>{d.originalPrincipalFormatted}</HideableValue>
                      </div>
                    </div>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] text-[0.6875rem] font-bold ${
                        isSel
                          ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)] text-white"
                          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
                      }`}
                      aria-hidden
                    >
                      {isSel ? "✓" : ""}
                    </span>
                  </button>

                  {isSel ? (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <label className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
                        Quanto deste valor foi pra este bem?
                      </label>
                      <WizardMoneyField
                        control={form.control}
                        name="allocationCents"
                        placeholder="R$ 0,00"
                      />
                      <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
                        A gente já preencheu com o total. Mexe só se uma parte foi pra outra coisa.
                      </p>
                      {error ? (
                        <span
                          role="alert"
                          className="text-[0.6875rem] text-[color:var(--semantic-negative)]"
                        >
                          {error}
                        </span>
                      ) : null}
                      <Button type="button" size="sm" onClick={onLink} loading={pending}>
                        Vincular
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[0.8125rem] text-[color:var(--text-muted)]">
            Você ainda não tem dívida pra vincular. Crie uma e ela já fica vinculada a este bem.
          </p>
        )}

        <Button type="button" variant="ghost" onClick={goCreate}>
          Criar nova dívida
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function LinkDebtEntryRow({
  assetId,
  assetLabel,
  availableDebts,
}: {
  assetId: string;
  assetLabel: string;
  availableDebts: AvailableDebtView[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const hasAvailable = availableDebts.length > 0;

  return (
    <>
      <ActionRow
        icon={Link2}
        title="Vincular dívida"
        onClick={() => {
          if (hasAvailable) setOpen(true);
          else router.push(`/app/dividas/nova?linkAssetId=${assetId}` as Route);
        }}
        {...(!hasAvailable ? { subtitle: "Cadastre uma dívida primeiro" } : {})}
      />
      <LinkDebtSheet
        assetId={assetId}
        assetLabel={assetLabel}
        availableDebts={availableDebts}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function LinkMoreDebtRow({
  assetId,
  assetLabel,
  availableDebts,
}: {
  assetId: string;
  assetLabel: string;
  availableDebts: AvailableDebtView[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const hasAvailable = availableDebts.length > 0;

  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <span className="text-[0.8125rem] text-[color:var(--text-secondary)]">
        Vincular outra dívida a este bem
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          if (hasAvailable) setOpen(true);
          else router.push(`/app/dividas/nova?linkAssetId=${assetId}` as Route);
        }}
      >
        {hasAvailable ? "Vincular" : "Nova dívida"}
      </Button>
      <LinkDebtSheet
        assetId={assetId}
        assetLabel={assetLabel}
        availableDebts={availableDebts}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

type DeactivationKind = "sold" | "lost" | "donated" | "not_specified";

function deactivationKindMeta(
  category: AssetDetailViewProps["category"],
): Record<DeactivationKind, { title: string; description: string }> {
  return {
    sold: { title: "Vendi", description: "Saiu do meu patrimônio por um valor." },
    lost: {
      title: "Perdi",
      description:
        category === "real_estate" ? "Desapropriação, disputa ou perda." : "Perda, dano ou roubo.",
    },
    donated: { title: "Doei", description: "Cedido sem contrapartida." },
    not_specified: { title: "Não informar", description: "Só quero arquivar." },
  };
}

const DEACTIVATION_KINDS: readonly DeactivationKind[] = [
  "sold",
  "lost",
  "donated",
  "not_specified",
];

interface DeactivateFormValues {
  salePriceCents: bigint;
}

function AssetOptionsMenu({
  assetId,
  label,
  category,
  onEdit,
}: {
  assetId: string;
  label: string;
  category: AssetDetailViewProps["category"];
  onEdit: () => void;
}) {
  const deactivationKindMetaForCategory = deactivationKindMeta(category);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DeactivationKind>("sold");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [soldNudge, setSoldNudge] = useState<bigint | null>(null);

  const form = useForm<DeactivateFormValues>({
    defaultValues: { salePriceCents: 0n as unknown as bigint },
  });

  function reset() {
    setKind("sold");
    setNotes("");
    setError(null);
    form.reset({ salePriceCents: 0n as unknown as bigint });
  }

  function onConfirm() {
    setError(null);
    let salePriceCents: string | null = null;
    let salePriceBigInt: bigint | null = null;
    if (kind === "sold") {
      const sp = form.getValues("salePriceCents");
      if (typeof sp !== "bigint" || sp <= 0n) {
        setError("Informe por quanto vendeu.");
        return;
      }
      salePriceBigInt = sp;
      salePriceCents = sp.toString();
    }
    const trimmedNotes = notes.trim();
    startTransition(async () => {
      const r = await deactivateAssetAction({
        assetId,
        kind,
        salePriceCents,
        reason: trimmedNotes.length > 0 ? trimmedNotes : null,
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await invalidateAssetCaches(queryClient);
      setOpen(false);
      if (kind === "sold" && salePriceBigInt !== null && salePriceBigInt > 0n) {
        setSoldNudge(salePriceBigInt);
        return;
      }
      router.push("/app/patrimonio" as Route);
    });
  }

  return (
    <>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SimpleTooltip label="Mais opções" side="bottom">
          <SheetTrigger
            aria-label="Mais opções"
            className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)]"
          >
            <Settings size={16} strokeWidth={2} aria-hidden />
          </SheetTrigger>
        </SimpleTooltip>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="p-4">
            <SheetTitle>{label}</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-[color:var(--border-soft)] border-t border-[color:var(--border-soft)]">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
                <Pencil size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                Editar
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setMenuOpen(false);
                setOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[color:var(--text-secondary)]">
                <PackageX size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">
                Vendi ou saiu
              </span>
            </button>
            <DeleteAssetButton assetId={assetId} label={label} trigger="row" />
          </div>
          <p className="px-4 pb-4 text-[0.6875rem] text-[color:var(--text-muted)]">
            &ldquo;Vendi ou saiu&rdquo; mantém o bem no histórico, só tira do patrimônio atual.
            &ldquo;Apagar&rdquo; remove definitivamente.
          </p>
        </SheetContent>
      </Sheet>

      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <SheetContent side="bottom" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>O que aconteceu com esse bem?</SheetTitle>
            <SheetDescription>
              A gente guarda esse registro pra você ter o histórico completo.
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-2">
            {DEACTIVATION_KINDS.map((k) => (
              <WizardRadioCard
                key={k}
                title={deactivationKindMetaForCategory[k].title}
                description={deactivationKindMetaForCategory[k].description}
                active={kind === k}
                onSelect={() => setKind(k)}
              />
            ))}
          </div>

          {kind === "sold" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
                Por quanto vendeu?
              </label>
              <WizardMoneyField
                control={form.control}
                name="salePriceCents"
                placeholder="R$ 0,00"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="asset-detail-notes"
              className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]"
            >
              Observações (opcional)
            </label>
            <textarea
              id="asset-detail-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes que queira lembrar depois."
              rows={3}
              maxLength={500}
              className={`${wizardInputClass} resize-none`}
            />
          </div>

          {error ? (
            <span role="alert" className="text-[0.75rem] text-[color:var(--semantic-negative)]">
              {error}
            </span>
          ) : null}

          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={onConfirm} loading={pending}>
              Confirmar desativação
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={soldNudge !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSoldNudge(null);
            router.push("/app/patrimonio" as Route);
          }
        }}
      >
        <SheetContent side="bottom" className="flex flex-col gap-3">
          <SheetHeader>
            <SheetTitle>
              Você liberou <HideableValue>{formatCentsToBRL(soldNudge ?? 0n)}</HideableValue>
            </SheetTitle>
            <SheetDescription>O que fazer com esse dinheiro agora?</SheetDescription>
          </SheetHeader>
          <Link
            href={"/app/dividas" as Route}
            className="focus-ring inline-flex h-10 w-full items-center justify-center rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 text-[0.875rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)]"
          >
            Quitar uma dívida
          </Link>
          <Link
            href={
              `/app/metas/nova?${buildGoalSeedQuery({
                type: "savings",
                targetCents: (soldNudge ?? 0n).toString(),
                savedCents: (soldNudge ?? 0n).toString(),
                deadlineIso: null,
              })}` as Route
            }
            className="focus-ring inline-flex h-10 w-full items-center justify-center rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 text-[0.875rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)]"
          >
            Guardar esse valor
          </Link>
          <Link
            href={"/app/simular/juros-compostos" as Route}
            className="focus-ring inline-flex h-10 w-full items-center justify-center rounded-md border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 text-[0.875rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)]"
          >
            Investir
          </Link>
        </SheetContent>
      </Sheet>
    </>
  );
}

type DepreciationKind = "appreciating" | "stable" | "depreciating" | "consumable";

const DEPRECIATION_KIND_META: Record<DepreciationKind, { title: string; description: string }> = {
  appreciating: { title: "Valoriza", description: "Imóveis bem localizados, terrenos." },
  stable: { title: "Fica igual", description: "Investimentos, ouro, conta poupança." },
  depreciating: { title: "Perde valor", description: "Carros, eletrônicos, móveis." },
  consumable: { title: "Acaba", description: "Viagens, eventos, refeições caras." },
};

const DEPRECIATION_KINDS: readonly DepreciationKind[] = [
  "appreciating",
  "stable",
  "depreciating",
  "consumable",
];

function DepreciationSection({
  assetId,
  view,
}: {
  assetId: string;
  view: {
    kind: DepreciationKind;
    kindLabel: string;
    ratePctYear: number;
    acquiredAtFormatted: string | null;
    acquiredAtIso: string | null;
  };
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DepreciationKind>(view.kind);
  const [rate, setRate] = useState(String(view.ratePctYear));
  const [acquiredAt, setAcquiredAt] = useState(view.acquiredAtIso ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setKind(view.kind);
    setRate(String(view.ratePctYear));
    setAcquiredAt(view.acquiredAtIso ?? "");
    setError(null);
  }

  function onSave() {
    setError(null);
    const rateNum = Number(rate.replace(",", "."));
    if (!Number.isFinite(rateNum) || rateNum < -50 || rateNum > 100) {
      setError("A taxa deve estar entre -50% e 100%.");
      return;
    }
    startTransition(async () => {
      const r = await updateAssetAction({
        assetId,
        depreciationKind: kind,
        depreciationRatePctYear: rateNum,
        acquiredAt,
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await invalidateAssetCaches(queryClient);
      setOpen(false);
    });
  }

  const formatted = Math.abs(view.ratePctYear).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  const isAppreciating = view.ratePctYear < 0;
  const RateIcon = isAppreciating ? TrendingUp : TrendingDown;
  const rateColor = isAppreciating
    ? "text-[color:var(--semantic-positive)]"
    : view.ratePctYear === 0
      ? "text-[color:var(--text-secondary)]"
      : "text-[color:var(--semantic-negative)]";
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
          Comportamento do valor
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          Editar
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Tipo
          </div>
          <div className="mt-0.5 text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            {view.kindLabel}
          </div>
        </div>
        <div>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Taxa anual
          </div>
          <div className={`mt-0.5 flex items-center gap-1 text-[0.875rem] font-bold ${rateColor}`}>
            {view.ratePctYear !== 0 ? (
              <RateIcon size={13} strokeWidth={2.25} aria-hidden className="shrink-0" />
            ) : null}
            {formatted}% ao ano
          </div>
        </div>
        {view.acquiredAtFormatted ? (
          <div>
            <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Aquisição
            </div>
            <div className="mt-0.5 text-[0.875rem] font-bold text-[color:var(--text-primary)]">
              {view.acquiredAtFormatted}
            </div>
          </div>
        ) : null}
      </div>

      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <SheetContent side="bottom" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Comportamento do valor</SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-2">
            {DEPRECIATION_KINDS.map((k) => (
              <WizardRadioCard
                key={k}
                title={DEPRECIATION_KIND_META[k].title}
                description={DEPRECIATION_KIND_META[k].description}
                active={kind === k}
                onSelect={() => setKind(k)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
              Quanto muda por ano (%)
            </label>
            <input
              type="number"
              step={0.5}
              min={-50}
              max={100}
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className={wizardInputClass}
            />
            <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
              Negativo = valoriza. Ex.: carro cai uns 15% (positivo), imóvel bom pode valorizar a
              -3% (negativo).
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
              Data de aquisição (opcional)
            </label>
            <input
              type="date"
              value={acquiredAt}
              onChange={(e) => setAcquiredAt(e.target.value)}
              className={wizardInputClass}
            />
            <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
              Sem data, o valor não muda com o tempo.
            </p>
          </div>

          {error ? (
            <span role="alert" className="text-[0.75rem] text-[color:var(--semantic-negative)]">
              {error}
            </span>
          ) : null}

          <Button type="button" size="sm" onClick={onSave} loading={pending}>
            Salvar
          </Button>
        </SheetContent>
      </Sheet>
    </section>
  );
}
