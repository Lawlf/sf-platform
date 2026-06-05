"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Car,
  Home,
  RefreshCw,
  Sparkles,
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
} from "@/app/components/ui/sheet";

import { HowItWorksSheet } from "../../../_components/how-it-works-sheet";
import { wizardInputClass } from "../../../dividas/nova/_components/wizard-field";
import { WizardMoneyField } from "../../../dividas/nova/_components/wizard-money-field";
import { WizardRadioCard } from "../../../dividas/nova/_components/wizard-radio-card";
import { buildGoalSeedQuery } from "../../../simular/_lib/goal-seed";
import { invalidateAssetCaches } from "../../_lib/invalidate";
import { deactivateAssetAction } from "../_actions/deactivate-asset.action";
import { linkDebtAction } from "../_actions/link-debt.action";
import { refreshFipeAction } from "../_actions/refresh-fipe.action";
import { refreshStockQuoteAction } from "../_actions/refresh-stock-quote.action";
import { unlinkDebtAction } from "../_actions/unlink-debt.action";
import { updateAssetAction } from "../_actions/update-asset.action";


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
  netWorthFormatted: string;
  netWorthIsNegative: boolean;
  fipeCode: string | null;
  fipeLastSyncedAt: string | null;
  linkedDebts: LinkedDebtView[];
  availableDebts: AvailableDebtView[];
  cashYield: CashYieldView | null;
  stock: StockView | null;
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
    kindLabel: string;
    ratePctYear: number;
    acquiredAtFormatted: string | null;
  } | null;
  /** Metas vinculadas a este ativo. */
  linkedGoals: SerializedGoalWithProgress[];
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

function categoryIcon(category: AssetDetailViewProps["category"]) {
  if (category === "vehicle") return <Car size={20} strokeWidth={1.5} aria-hidden />;
  if (category === "real_estate") return <Home size={20} strokeWidth={1.5} aria-hidden />;
  if (category === "investment") return <TrendingUp size={20} strokeWidth={1.5} aria-hidden />;
  if (category === "cash") return <Wallet size={20} strokeWidth={1.5} aria-hidden />;
  return <Box size={20} strokeWidth={1.5} aria-hidden />;
}

export function AssetDetailView(props: AssetDetailViewProps) {
  const nwColor = props.netWorthIsNegative
    ? "text-[color:var(--semantic-negative)]"
    : "text-[color:var(--semantic-positive)]";

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-tier-1 relative overflow-hidden p-[22px]">
        <div
          className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-white/[0.12]"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="text-[0.6875rem] font-semibold uppercase tracking-wide opacity-95">
              {categoryLabel(props.category)}
            </div>
            <h1
              className="mt-1 text-[1.5rem] font-extrabold leading-tight"
              style={{ letterSpacing: "-0.4px" }}
            >
              {props.label}
            </h1>
          </div>
          <span className="opacity-80">{categoryIcon(props.category)}</span>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-3 text-sm">
          <div>
            <div className="text-[0.625rem] font-semibold uppercase tracking-wide opacity-80">
              Valor atual
            </div>
            <div className="mt-0.5 font-bold">
              <HideableValue>{props.currentValueFormatted}</HideableValue>
            </div>
          </div>
          <div>
            <div className="text-[0.625rem] font-semibold uppercase tracking-wide opacity-80">
              Patrimônio líquido
            </div>
            <div className={`mt-0.5 font-bold ${nwColor}`}>
              <HideableValue>{props.netWorthFormatted}</HideableValue>
            </div>
          </div>
        </div>
      </section>

      <EditValueSection assetId={props.assetId} currentValueCents={props.currentValueCents} />

      {props.purchasePrice ? <PurchasePriceSection view={props.purchasePrice} /> : null}

      {props.description ? <DescriptionSection text={props.description} /> : null}

      {props.depreciation ? <DepreciationSection view={props.depreciation} /> : null}

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

      {props.category === "investment" && props.stock ? (
        <StockSection assetId={props.assetId} stock={props.stock} isPro={props.isPro} />
      ) : null}

      <LinkedDebtsSection assetId={props.assetId} linkedDebts={props.linkedDebts} />

      <LinkNewDebtSection
        assetId={props.assetId}
        availableDebts={props.availableDebts}
        hasLinkedDebts={props.linkedDebts.length > 0}
      />

      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Metas vinculadas</h2>
          <Link
            href={
              `/app/metas/nova?${buildGoalSeedQuery({
                type: "savings",
                targetCents: "0",
                savedCents: "0",
                deadlineIso: null,
                fundingMode: "linked",
                linkedAssetId: props.assetId,
              })}` as Route
            }
            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
          >
            Criar meta com este bem
          </Link>
        </div>
        {props.linkedGoals.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {props.linkedGoals.map((g) => (
              <li key={g.goal.id}>
                <Link
                  href={`/app/metas/${g.goal.id}` as Route}
                  className="flex items-center justify-between rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2 text-[0.8125rem] hover:bg-[color:var(--surface-1)]"
                >
                  <span className="font-medium text-[color:var(--text-primary)]">{g.goal.title}</span>
                  <span className="text-[color:var(--text-muted)]">{g.progress.pct}%</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[0.6875rem] text-[color:var(--text-muted)]">
            Crie uma meta de poupança usando o saldo deste bem como referência de progresso.
          </p>
        )}
      </section>

      <DeactivateSection assetId={props.assetId} label={props.label} />
    </div>
  );
}

interface EditValueFormValues {
  currentValueCents: bigint;
}

function EditValueSection({
  assetId,
  currentValueCents,
}: {
  assetId: string;
  currentValueCents: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EditValueFormValues>({
    defaultValues: {
      currentValueCents: BigInt(currentValueCents),
    },
  });

  function onSave() {
    setError(null);
    const cents = form.getValues("currentValueCents");
    if (typeof cents !== "bigint" || cents < 0n) {
      setError("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const r = await updateAssetAction({
        assetId,
        currentValueCents: cents.toString(),
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      await invalidateAssetCaches(queryClient);
      setOpen(false);
    });
  }

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Valor atual</h2>
        {!open ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Editar
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="mt-3 flex flex-col gap-2">
          <WizardMoneyField control={form.control} name="currentValueCents" placeholder="R$ 0,00" />
          {error ? (
            <span role="alert" className="text-[0.6875rem] text-[color:var(--semantic-negative)]">
              {error}
            </span>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={onSave} loading={pending}>
              Salvar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </section>
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

function StockSection({
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
        setSuccess(`Cotação de ${r.symbol} atualizada.`);
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
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Ação</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
              {stock.ticker}
            </span>
            <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
              {stock.shares} {stock.shares === 1 ? "ação" : "ações"}
            </span>
          </div>
        </div>
        <HowItWorksSheet topic="acoes" variant="brand" />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.75rem]">
        <div>
          <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Preço médio
          </dt>
          <dd className="mt-0.5 font-semibold text-[color:var(--text-primary)]">
            <HideableValue>{stock.avgPriceFormatted}</HideableValue>
          </dd>
        </div>
        <div>
          <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Última cotação
          </dt>
          <dd className="mt-0.5 font-semibold text-[color:var(--text-primary)]">
            {stock.lastQuoteFormatted ? (
              <HideableValue>{stock.lastQuoteFormatted}</HideableValue>
            ) : (
              "—"
            )}
            {stock.lastQuoteAt ? (
              <span className="ml-1 text-[0.625rem] font-normal text-[color:var(--text-muted)]">
                · {stock.lastQuoteAt}
              </span>
            ) : null}
          </dd>
        </div>
        {stock.gainLossFormatted ? (
          <div className="col-span-2">
            <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Ganho / perda
            </dt>
            <dd className={`mt-0.5 flex items-center gap-1 font-semibold ${gainLossColor}`}>
              <TrendIcon size={14} strokeWidth={2.25} aria-hidden />
              <span>
                <HideableValue>{stock.gainLossFormatted}</HideableValue>
              </span>
              {stock.gainLossPctFormatted ? (
                <span className="text-[0.6875rem] opacity-80">({stock.gainLossPctFormatted})</span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onRefresh} loading={pending}>
          <RefreshCw size={14} strokeWidth={2} aria-hidden />
          Atualizar cotação
        </Button>
        <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-brand-500)]/[0.12] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
          <Sparkles size={10} strokeWidth={2.5} aria-hidden />
          {isPro ? "Atualização diária ativada · Pro" : "Atualização diária no plano Pro"}
        </span>
      </div>

      {error ? (
        <span role="alert" className="mt-2 block text-[0.6875rem] text-[color:var(--semantic-negative)]">
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
        <span role="alert" className="mt-2 block text-[0.6875rem] text-[color:var(--semantic-negative)]">
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
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Dívidas vinculadas</h2>
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

function LinkNewDebtSection({
  assetId,
  availableDebts,
  hasLinkedDebts,
}: {
  assetId: string;
  availableDebts: AvailableDebtView[];
  hasLinkedDebts: boolean;
}) {
  const [open, setOpen] = useState(false);
  const title = hasLinkedDebts ? "Vincular nova dívida" : "Dívidas vinculadas";
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</h2>
        {availableDebts.length > 0 ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? "Fechar" : "Vincular"}
          </Button>
        ) : (
          <Button asChild size="sm" variant="ghost">
            <Link href={"/app/dividas/nova" as Route}>Nova dívida</Link>
          </Button>
        )}
      </div>
      {!hasLinkedDebts && !open ? (
        <p className="mt-2 text-[0.6875rem] text-[color:var(--text-muted)]">
          {availableDebts.length > 0
            ? "Vincule uma dívida pra acompanhar quanto ainda deve neste bem."
            : "Cadastre uma dívida primeiro pra poder vincular a este bem."}
        </p>
      ) : null}
      {open && availableDebts.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {availableDebts.map((d) => (
            <LinkRow key={d.debtId} assetId={assetId} debt={d} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

interface LinkRowFormValues {
  allocationCents: bigint;
}

function LinkRow({ assetId, debt }: { assetId: string; debt: AvailableDebtView }) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LinkRowFormValues>({
    defaultValues: { allocationCents: 0n as unknown as bigint },
  });

  function onSubmit() {
    setError(null);
    const cents = form.getValues("allocationCents");
    if (typeof cents !== "bigint" || cents <= 0n) {
      setError("Informe um valor de alocação.");
      return;
    }
    const principal = BigInt(debt.originalPrincipalCents);
    if (cents > principal) {
      setError(`Acima do valor original (${formatCentsToBRL(principal)}).`);
      return;
    }
    startTransition(async () => {
      const r = await linkDebtAction({
        assetId,
        debtId: debt.debtId,
        allocationOriginalCents: cents.toString(),
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      form.reset({ allocationCents: 0n as unknown as bigint });
      await invalidateAssetCaches(queryClient);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3">
      <div>
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{debt.label}</p>
        <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
          Original: <HideableValue>{debt.originalPrincipalFormatted}</HideableValue>
        </p>
      </div>
      <WizardMoneyField control={form.control} name="allocationCents" placeholder="R$ 0,00" />
      {error ? (
        <span role="alert" className="text-[0.6875rem] text-[color:var(--semantic-negative)]">
          {error}
        </span>
      ) : null}
      <Button type="button" size="sm" onClick={onSubmit} loading={pending}>
        Vincular
      </Button>
    </li>
  );
}

function PurchasePriceSection({ view }: { view: PurchasePriceView }) {
  const deltaColor = view.isNegative
    ? "text-[color:var(--semantic-negative)]"
    : "text-[color:var(--semantic-positive)]";
  const TrendIcon = view.isNegative ? TrendingDown : TrendingUp;

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Valorização</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.75rem]">
        <div>
          <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Pagou
          </dt>
          <dd className="mt-0.5 font-semibold text-[color:var(--text-primary)]">
            <HideableValue>{view.paidFormatted}</HideableValue>
          </dd>
        </div>
        <div>
          <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Vale agora
          </dt>
          <dd className="mt-0.5 font-semibold text-[color:var(--text-primary)]">
            <HideableValue>{view.currentFormatted}</HideableValue>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            {view.isNegative ? "Perda" : "Ganho"}
          </dt>
          <dd className={`mt-0.5 flex items-center gap-1 font-semibold ${deltaColor}`}>
            <TrendIcon size={14} strokeWidth={2.25} aria-hidden />
            <span>
              <HideableValue>{view.deltaFormatted}</HideableValue>
            </span>
            {view.deltaPctFormatted ? (
              <span className="text-[0.6875rem] opacity-80">({view.deltaPctFormatted})</span>
            ) : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}

type DeactivationKind = "sold" | "lost" | "donated" | "not_specified";

const DEACTIVATION_KIND_META: Record<DeactivationKind, { title: string; description: string }> = {
  sold: { title: "Vendi", description: "Saiu do meu patrimônio por um valor." },
  lost: { title: "Perdi", description: "Perda, dano ou roubo." },
  donated: { title: "Doei", description: "Cedido sem contrapartida." },
  not_specified: { title: "Não informar", description: "Só quero arquivar." },
};

const DEACTIVATION_KINDS: readonly DeactivationKind[] = [
  "sold",
  "lost",
  "donated",
  "not_specified",
];

interface DeactivateFormValues {
  salePriceCents: bigint;
}

function DeactivateSection({ assetId, label }: { assetId: string; label: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
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
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Tirar do patrimônio</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            Desativar
          </Button>
          <DeleteAssetButton assetId={assetId} label={label} />
        </div>
      </div>
      <p className="mt-2 text-[0.6875rem] text-[color:var(--text-muted)]">
        O bem permanecerá no histórico, mas deixa de compor seu patrimônio atual. Para remover
        definitivamente, use o ícone de lixeira.
      </p>

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
                title={DEACTIVATION_KIND_META[k].title}
                description={DEACTIVATION_KIND_META[k].description}
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
            <label className="text-[0.75rem] font-semibold text-[color:var(--text-primary)]">
              Observações (opcional)
            </label>
            <textarea
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
    </section>
  );
}

function DescriptionSection({ text }: { text: string }) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
        Descrição
      </h2>
      <p className="mt-2 whitespace-pre-line text-[0.8125rem] text-[color:var(--text-primary)]">
        {text}
      </p>
    </section>
  );
}

function DepreciationSection({
  view,
}: {
  view: { kindLabel: string; ratePctYear: number; acquiredAtFormatted: string | null };
}) {
  const formatted = view.ratePctYear.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  const sign = view.ratePctYear < 0 ? "" : "";
  const isAppreciating = view.ratePctYear < 0;
  const rateColor = isAppreciating
    ? "text-[color:var(--semantic-positive)]"
    : view.ratePctYear === 0
      ? "text-[color:var(--text-secondary)]"
      : "text-[color:var(--semantic-negative)]";
  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
        Comportamento do valor
      </h2>
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
          <div className={`mt-0.5 text-[0.875rem] font-bold ${rateColor}`}>
            {sign}
            {formatted}%
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
    </section>
  );
}
