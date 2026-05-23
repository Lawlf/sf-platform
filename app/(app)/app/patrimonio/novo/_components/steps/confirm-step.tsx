"use client";

import { SummaryList } from "../../../../dividas/nova/_components/summary-list";
import { WizardShell, type WizardStep } from "../../../../dividas/nova/_components/wizard-shell";
import type { AssetWizardForm, Category, InvestmentType, YieldType } from "../asset-wizard.client";

function formatCentsBRL(cents: bigint | null | undefined): string {
  if (cents === null || cents === undefined) return "R$ 0,00";
  const reais = Number(cents) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatBRDate(iso: string | null | undefined): string | null {
  if (!iso || iso.length === 0) return null;
  // iso may be "YYYY-MM-DD"; render as "DD/MM/YYYY" without timezone math.
  const parts = iso.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  return `${d}/${m}/${y}`;
}

const CATEGORY_LABEL: Record<Category, string> = {
  vehicle: "Veículo",
  real_estate: "Imóvel",
  investment: "Investimento",
  cash: "Reserva / Conta",
  other: "Outro",
};

const INVESTMENT_TYPE_LABEL: Record<InvestmentType, string> = {
  stocks: "Ações",
  fund: "Fundo",
  fixed_income: "Renda fixa",
  crypto: "Cripto",
  other: "Outro",
};

const YIELD_TYPE_LABEL: Record<YieldType, string> = {
  none: "Não rende",
  cdi: "% do CDI",
  fixed_pct_year: "Taxa fixa anual",
};

export interface ConfirmStepProps {
  form: AssetWizardForm;
  visualStep: WizardStep;
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
  serverError: string | null;
  investmentTypeWatched: InvestmentType | undefined;
  totalSteps?: number;
}

export function ConfirmStep({
  form,
  visualStep,
  onBack,
  onSubmit,
  pending,
  serverError,
  totalSteps,
}: ConfirmStepProps) {
  const values = form.getValues();
  const category = values.category;
  const investmentType = values.investmentType;
  const items: { label: string; value: string }[] = [
    { label: "Categoria", value: CATEGORY_LABEL[category] },
    { label: "Nome", value: values.label?.trim() || "Sem nome" },
  ];

  if (category === "investment" && investmentType) {
    items.push({ label: "Tipo", value: INVESTMENT_TYPE_LABEL[investmentType] });
  }

  if (category === "investment" && investmentType === "stocks") {
    const tickerVal = (values.ticker ?? "").trim().toUpperCase();
    if (tickerVal) items.push({ label: "Ticker", value: tickerVal });
    if (values.tickerCompanyName) {
      items.push({ label: "Empresa", value: values.tickerCompanyName });
    }
    const sharesNum = values.shares ? Number.parseInt(values.shares, 10) : NaN;
    if (Number.isFinite(sharesNum) && sharesNum > 0) {
      items.push({ label: "Quantidade", value: String(sharesNum) });
    }
    if (values.avgPriceCents && values.avgPriceCents > 0n) {
      items.push({ label: "Preço médio", value: formatCentsBRL(values.avgPriceCents) });
    }
    if (values.lastQuoteCents && values.lastQuoteCents > 0n) {
      items.push({ label: "Última cotação", value: formatCentsBRL(values.lastQuoteCents) });
    }
  }

  if (category === "vehicle") {
    if (values.brand) items.push({ label: "Marca", value: values.brand });
    if (values.model) items.push({ label: "Modelo", value: values.model });
    if (values.year) items.push({ label: "Ano", value: values.year });
  }

  if (category === "real_estate") {
    if (values.addressCity) items.push({ label: "Cidade", value: values.addressCity });
    if (values.rentMonthlyCents && values.rentMonthlyCents > 0n) {
      items.push({ label: "Aluguel mensal", value: formatCentsBRL(values.rentMonthlyCents) });
    }
  }

  if (category === "cash") {
    if (values.institution) items.push({ label: "Onde está", value: values.institution });
    const yt: YieldType = values.yieldType ?? "none";
    items.push({ label: "Rendimento", value: YIELD_TYPE_LABEL[yt] });
    if (yt !== "none" && values.yieldRatePct) {
      const rate = values.yieldRatePct.replace(",", ".");
      items.push({
        label: yt === "cdi" ? "% do CDI" : "Taxa anual",
        value: yt === "cdi" ? `${rate}% CDI` : `${rate}% a.a.`,
      });
    }
  }

  if (category === "investment" && investmentType !== "stocks" && values.institution) {
    items.push({ label: "Instituição", value: values.institution });
  }

  if (category === "other" && values.description) {
    items.push({ label: "Descrição", value: values.description });
  }

  items.push({ label: "Valor atual", value: formatCentsBRL(values.currentValueCents) });

  // Purchase price (não exibido para stocks, que já trazem avgPrice).
  const isStockCat = category === "investment" && investmentType === "stocks";
  if (
    !isStockCat &&
    values.purchasePriceCents !== undefined &&
    values.purchasePriceCents !== null &&
    values.purchasePriceCents > 0n
  ) {
    items.push({ label: "Pagou", value: formatCentsBRL(values.purchasePriceCents) });
  }

  const acquired = formatBRDate(values.acquiredAt ?? null);
  if (acquired) items.push({ label: "Aquisição", value: acquired });

  const linkedAllocations = (values.allocations ?? []).filter((a) => a.allocationCents > 0n);
  if (linkedAllocations.length > 0) {
    const totalAlloc = linkedAllocations.reduce((acc, a) => acc + a.allocationCents, 0n);
    items.push({
      label: "Dívidas vinculadas",
      value: `${linkedAllocations.length} (${formatCentsBRL(totalAlloc)} alocado)`,
    });
  }

  // Dívida nova inline: ainda não foi criada, mas será criada antes do ativo.
  if (values.linkedDebtChoice === "new" && values.newDebtKind) {
    const debtLabel = (values.newDebtLabel ?? "").trim() || "Sem nome";
    const debtPrincipal =
      values.newDebtPrincipalCents && values.newDebtPrincipalCents > 0n
        ? formatCentsBRL(values.newDebtPrincipalCents)
        : "R$ 0,00";
    items.push({
      label: "Nova dívida",
      value: `${debtLabel} (${debtPrincipal})`,
    });
  }

  return (
    <WizardShell
      currentStep={visualStep}
      title="Resumo do ativo"
      description="Confira como vai ficar antes de salvar."
      onBack={onBack}
      totalSteps={totalSteps}
      primary={{
        label: "Cadastrar ativo",
        onClick: onSubmit,
        disabled: pending,
        loading: pending,
      }}
    >
      <SummaryList items={items} />

      {serverError ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          {serverError}
        </div>
      ) : null}
    </WizardShell>
  );
}
