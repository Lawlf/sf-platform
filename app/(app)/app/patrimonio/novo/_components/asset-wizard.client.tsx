"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { valueCryptoCents } from "@/domain/services/crypto-valuation.service";
import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";

import type { WizardStep } from "../../../dividas/nova/_components/wizard-shell";
import { invalidateAssetCaches } from "../../_lib/invalidate";
import { createAssetAction } from "../_actions/create-asset.action";
import { createDebtForAssetAction } from "../_actions/create-debt-for-asset.action";

import { CATEGORIES, type Category } from "./asset-categories";
import { CategoryStep } from "./steps/category-step";
import { ConfirmStep } from "./steps/confirm-step";
import { DetailsStep } from "./steps/details-step";
import { InvestmentTypeStep } from "./steps/investment-type-step";
import { LinkedDebtStep } from "./steps/linked-debt-step";

export { CATEGORIES };
export type { Category };

export const INVESTMENT_TYPES = ["stocks", "fund", "fixed_income", "crypto", "other"] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const DEPRECIATION_KINDS = ["appreciating", "stable", "depreciating", "consumable"] as const;
export type DepreciationKind = (typeof DEPRECIATION_KINDS)[number];

export const YIELD_TYPES = ["none", "cdi", "fixed_pct_year"] as const;
export type YieldType = (typeof YIELD_TYPES)[number];

export const NEW_DEBT_KINDS = ["financing", "personal_loan", "credit_card"] as const;
export type NewDebtKind = (typeof NEW_DEBT_KINDS)[number];

export const wizardFormSchema = z.object({
  category: z.enum(CATEGORIES),
  label: z.string().min(1, "Nome obrigatório.").max(120, "Máximo de 120 caracteres."),
  currentValueCents: z.bigint().nonnegative("Valor inválido."),
  currency: z.enum(CURRENCIES),
  purchasePriceCents: z.bigint().nullable().optional(),
  acquiredAt: z.string().optional().nullable(),

  // vehicle
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  color: z.string().optional(),

  // real_estate
  addressCity: z.string().optional(),
  squareMeters: z.string().optional(),
  rentMonthlyCents: z.bigint().nullable().optional(),

  // investment
  investmentType: z.enum(INVESTMENT_TYPES).optional(),
  institution: z.string().optional(),
  annualRatePct: z.string().optional(),

  // stock-specific
  ticker: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === "" || /^[A-Z0-9.]{1,15}$/i.test(v), "Sigla inválida."),
  coinId: z.string().optional(),
  shares: z.string().optional(),
  avgPriceCents: z.bigint().nullable().optional(),
  lastQuoteCents: z.bigint().nullable().optional(),
  tickerCompanyName: z.string().optional(),

  // cash yield
  yieldType: z.enum(YIELD_TYPES).optional(),
  yieldRatePct: z.string().optional(),

  // other
  description: z.string().optional(),

  // depreciation
  depreciationKind: z.enum(DEPRECIATION_KINDS),
  depreciationRatePctYear: z.string(),

  // linked debts
  linkedDebtChoice: z.enum(["unset", "no", "yes", "new"]),
  allocations: z.array(
    z.object({
      debtId: z.string(),
      allocationCents: z.bigint(),
    }),
  ),

  // inline new debt creation (only used when linkedDebtChoice === "new")
  newDebtKind: z.enum(NEW_DEBT_KINDS).optional(),
  newDebtLabel: z.string().optional(),
  newDebtPrincipalCents: z.bigint().nullable().optional(),
  newDebtInstallments: z.string().optional(),
  newDebtMonthlyRatePct: z.string().optional(),
});

export type AssetWizardFormValues = z.infer<typeof wizardFormSchema>;

export type AssetWizardForm = UseFormReturn<AssetWizardFormValues>;

export type WizardStepId = "category" | "investment_type" | "details" | "linked_debt" | "confirm";

export function defaultKindForCategory(category: Category): DepreciationKind {
  if (category === "vehicle") return "depreciating";
  if (category === "real_estate") return "appreciating";
  if (category === "investment") return "stable";
  if (category === "cash") return "stable";
  return "depreciating";
}

export function defaultRateForKind(kind: DepreciationKind, category: Category): number {
  if (kind === "appreciating") return -3;
  if (kind === "stable") return 0;
  if (kind === "consumable") return 100;
  if (category === "vehicle") return 15;
  return 25;
}

export function shouldShowDepreciationSection(category: Category): boolean {
  return category !== "cash" && category !== "investment";
}

const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

export function AssetWizardClient({
  initialCategory,
  defaultCurrency = "BRL",
  onClose,
}: {
  initialCategory?: Category | undefined;
  defaultCurrency?: Currency;
  onClose?: (() => void) | undefined;
} = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStepId>(
    initialCategory
      ? initialCategory === "investment"
        ? "investment_type"
        : "details"
      : "category",
  );
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AssetWizardFormValues>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: {
      category: initialCategory ?? "vehicle",
      label: "",
      currentValueCents: 0n as unknown as bigint,
      currency: defaultCurrency,
      purchasePriceCents: null,
      acquiredAt: "",
      brand: "",
      model: "",
      year: "",
      color: "",
      addressCity: "",
      squareMeters: "",
      rentMonthlyCents: null,
      investmentType: "stocks",
      institution: "",
      annualRatePct: "",
      ticker: "",
      coinId: "",
      shares: "",
      avgPriceCents: null,
      lastQuoteCents: null,
      tickerCompanyName: "",
      yieldType: "none",
      yieldRatePct: "",
      description: "",
      depreciationKind: "depreciating",
      depreciationRatePctYear: "15",
      linkedDebtChoice: "unset",
      allocations: [],
      newDebtKind: undefined,
      newDebtLabel: "",
      newDebtPrincipalCents: null,
      newDebtInstallments: "12",
      newDebtMonthlyRatePct: "",
    },
  });

  const category = form.watch("category");
  const investmentType = form.watch("investmentType");

  const hasInvestmentStep = category === "investment";
  // Dívida atrelada só faz sentido pra bem financiável (carro, imóvel). Reserva,
  // investimento e "outro" pulam essa tela direto pro resumo.
  const hasDebtStep = category === "vehicle" || category === "real_estate";

  const totalSteps = 3 + (hasInvestmentStep ? 1 : 0) + (hasDebtStep ? 1 : 0);

  const visualStep = useMemo(() => {
    if (step === "category") return 1 as const;
    if (step === "investment_type") return 2 as const;
    if (step === "details") return hasInvestmentStep ? 3 : 2;
    if (step === "linked_debt") return hasInvestmentStep ? 4 : 3;
    return totalSteps as WizardStep;
  }, [step, hasInvestmentStep, totalSteps]);

  function gotoNext() {
    if (step === "category") {
      // getValues, não watch: onChange + onNext no mesmo tick deixa watch stale.
      const selectedCategory = form.getValues("category");
      const nextKind = defaultKindForCategory(selectedCategory);
      const nextRate = defaultRateForKind(nextKind, selectedCategory);
      form.setValue("depreciationKind", nextKind, { shouldDirty: false });
      form.setValue("depreciationRatePctYear", String(nextRate), { shouldDirty: false });
      if (selectedCategory === "investment") setStep("investment_type");
      else setStep("details");
      return;
    }
    if (step === "investment_type") {
      setStep("details");
      return;
    }
    if (step === "details") {
      setStep(hasDebtStep ? "linked_debt" : "confirm");
      return;
    }
    if (step === "linked_debt") {
      setStep("confirm");
      return;
    }
  }

  function gotoBack() {
    if (step === "confirm") {
      setStep(hasDebtStep ? "linked_debt" : "details");
      return;
    }
    if (step === "linked_debt") {
      setStep("details");
      return;
    }
    if (step === "details") {
      if (hasInvestmentStep) setStep("investment_type");
      else setStep("category");
      return;
    }
    if (step === "investment_type") {
      setStep("category");
      return;
    }
    if (onClose) onClose();
    else router.push("/app/patrimonio" as Route);
  }

  async function handleSubmit() {
    setServerError(null);
    const valid = await form.trigger();
    if (!valid) return;
    const values = form.getValues();

    let currentValueCents = values.currentValueCents;
    if (currentValueCents < 0n) {
      form.setError("currentValueCents", { message: "Valor inválido." });
      return;
    }

    let purchasePriceCents: bigint | null =
      values.purchasePriceCents !== undefined &&
      values.purchasePriceCents !== null &&
      values.purchasePriceCents > 0n
        ? values.purchasePriceCents
        : null;

    let metadataJson: string | null = null;
    if (values.category === "vehicle") {
      const brand = values.brand?.trim() ?? "";
      const model = values.model?.trim() ?? "";
      const yearNum = values.year ? Number.parseInt(values.year, 10) : NaN;
      if (brand && model && Number.isFinite(yearNum)) {
        metadataJson = JSON.stringify({
          kind: "vehicle",
          brand,
          model,
          year: yearNum,
          ...(values.color?.trim() ? { color: values.color.trim() } : {}),
        });
      }
    } else if (values.category === "real_estate") {
      const city = values.addressCity?.trim() ?? "";
      if (city) {
        const sqm = values.squareMeters ? Number.parseInt(values.squareMeters, 10) : NaN;
        const rentCents = values.rentMonthlyCents ?? null;
        metadataJson = JSON.stringify({
          kind: "real_estate",
          addressCity: city,
          ...(Number.isFinite(sqm) ? { squareMeters: sqm } : {}),
          ...(rentCents !== null && rentCents > 0n ? { rentMonthlyCents: Number(rentCents) } : {}),
        });
      }
    } else if (values.category === "investment") {
      const invType = values.investmentType ?? "other";
      const institution = values.institution?.trim() ?? "";
      const isStock = invType === "stocks";
      const isCrypto = invType === "crypto";
      const tickerRaw = (values.ticker ?? "").trim().toUpperCase();
      const sharesIntRaw = values.shares ? Number.parseInt(values.shares, 10) : NaN;
      const sharesFloatRaw = values.shares
        ? Number.parseFloat(values.shares.replace(",", "."))
        : NaN;
      const avgPrice = values.avgPriceCents ?? null;

      const stockTickerValid = isStock && /^[A-Z0-9]{3,8}$/.test(tickerRaw);
      const cryptoTickerValid = isCrypto && tickerRaw.length > 0;
      const tickerValid = stockTickerValid || cryptoTickerValid;
      const stockSharesValid = isStock && Number.isFinite(sharesIntRaw) && sharesIntRaw > 0;
      const cryptoQtyValid = isCrypto && Number.isFinite(sharesFloatRaw) && sharesFloatRaw > 0;
      const avgPriceValid = isStock && avgPrice !== null && avgPrice > 0n;
      const cryptoAvgValid = isCrypto && avgPrice !== null && avgPrice > 0n;
      const cryptoCoinId = (values.coinId ?? "").trim().toLowerCase();
      const cryptoCoinIdValid = isCrypto && cryptoCoinId.length > 0;

      if (isStock && tickerValid && stockSharesValid && avgPriceValid) {
        currentValueCents = avgPrice * BigInt(sharesIntRaw);
        purchasePriceCents = avgPrice * BigInt(sharesIntRaw);
      }

      const cryptoUnitPrice = values.lastQuoteCents ?? null;
      const cryptoPriceValid = isCrypto && cryptoUnitPrice !== null && cryptoUnitPrice > 0n;
      if (isCrypto && cryptoQtyValid && cryptoPriceValid) {
        currentValueCents = valueCryptoCents(sharesFloatRaw, cryptoUnitPrice);
      }
      if (isCrypto && cryptoQtyValid && cryptoAvgValid && avgPrice !== null) {
        purchasePriceCents = valueCryptoCents(sharesFloatRaw, avgPrice);
      }

      const isFixedIncome = invType === "fixed_income";
      const rateParsed = values.annualRatePct
        ? Number.parseFloat(values.annualRatePct.replace(",", "."))
        : NaN;
      const rateValid = isFixedIncome && Number.isFinite(rateParsed) && rateParsed > 0;

      metadataJson = JSON.stringify({
        kind: "investment",
        investmentType: invType,
        ...(institution ? { institution } : {}),
        ...((isStock || isCrypto) && tickerValid ? { ticker: tickerRaw } : {}),
        ...(cryptoCoinIdValid ? { coinId: cryptoCoinId } : {}),
        ...(isStock && stockSharesValid ? { shares: sharesIntRaw } : {}),
        ...(isCrypto && cryptoQtyValid ? { shares: sharesFloatRaw } : {}),
        ...(avgPrice !== null && avgPrice > 0n && (isStock || isCrypto)
          ? { avgPriceCents: avgPrice.toString() }
          : {}),
        ...(isCrypto && cryptoPriceValid
          ? { lastQuoteCents: cryptoUnitPrice.toString(), lastQuoteAt: new Date().toISOString() }
          : {}),
        ...(rateValid ? { annualRatePct: rateParsed } : {}),
      });
    } else if (values.category === "cash") {
      const institution = values.institution?.trim() ?? "";
      const yt: YieldType = values.yieldType ?? "none";
      const rateParsed = Number.parseFloat((values.yieldRatePct ?? "0").replace(",", "."));
      const rateValid = Number.isFinite(rateParsed) && rateParsed > 0;
      metadataJson = JSON.stringify({
        kind: "cash",
        ...(institution ? { institution } : {}),
        yieldType: yt,
        ...(yt !== "none" && rateValid ? { yieldRatePct: rateParsed } : {}),
      });
    } else if (values.category === "other") {
      const desc = values.description?.trim() ?? "";
      metadataJson = JSON.stringify({
        kind: "other",
        ...(desc ? { description: desc } : {}),
      });
    }

    const showDepreciation = shouldShowDepreciationSection(values.category);
    const rateParsed = Number.parseFloat((values.depreciationRatePctYear ?? "0").replace(",", "."));

    let allocationsPayload = (values.allocations ?? [])
      .filter((a) => a.allocationCents > 0n)
      .map((a) => ({
        debtId: a.debtId,
        allocationOriginalCents: a.allocationCents.toString(),
      }));

    // Quando o usuário escolheu cadastrar uma dívida nova inline, criamos a dívida primeiro,
    // depois construímos a allocation usando o id retornado. Falha aqui aborta a criação do ativo.
    if (values.linkedDebtChoice === "new") {
      const kind = values.newDebtKind;
      const label = (values.newDebtLabel ?? "").trim();
      const principalCents = values.newDebtPrincipalCents ?? null;
      const installmentsNum = Number.parseInt(values.newDebtInstallments ?? "", 10);
      const monthlyRate = Number.parseFloat(
        (values.newDebtMonthlyRatePct ?? "0").replace(",", "."),
      );

      if (!kind) {
        setServerError("Escolha o tipo da nova dívida.");
        return;
      }
      if (label.length === 0) {
        setServerError("Informe o nome da nova dívida.");
        return;
      }
      if (principalCents === null || principalCents <= 0n) {
        setServerError("Informe o valor total da nova dívida.");
        return;
      }
      if (!Number.isFinite(installmentsNum) || installmentsNum < 1) {
        setServerError("Informe o número de parcelas.");
        return;
      }
      if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
        setServerError("Taxa mensal inválida.");
        return;
      }

      const startDate =
        values.acquiredAt && values.acquiredAt.length > 0
          ? values.acquiredAt
          : new Date().toISOString().slice(0, 10);

      const debtResult = await createDebtForAssetAction({
        kind,
        label,
        principalCents: principalCents.toString(),
        installments: installmentsNum,
        monthlyRatePct: monthlyRate,
        startDate,
        currency: values.currency,
      });
      if (!debtResult.ok) {
        setServerError(debtResult.message);
        return;
      }
      allocationsPayload = [
        {
          debtId: debtResult.data.debtId,
          allocationOriginalCents: principalCents.toString(),
        },
      ];
    }

    const payload = {
      category: values.category,
      label: values.label.trim(),
      currentValueCents: currentValueCents.toString(),
      currency: values.currency,
      metadataJson,
      acquiredAt: values.acquiredAt && values.acquiredAt.length > 0 ? values.acquiredAt : null,
      allocations: allocationsPayload,
      depreciationKind: showDepreciation ? values.depreciationKind : "stable",
      depreciationRatePctYear: showDepreciation && Number.isFinite(rateParsed) ? rateParsed : 0,
      purchaseDate:
        showDepreciation && values.acquiredAt && values.acquiredAt.length > 0
          ? values.acquiredAt
          : null,
      purchasePriceCents: purchasePriceCents !== null ? purchasePriceCents.toString() : null,
      monthlyCostEstimateCents: null,
    };

    startTransition(async () => {
      const r = await createAssetAction(payload);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      await invalidateAssetCaches(queryClient);
      router.push(`/app/patrimonio/${r.data.assetId}` as Route);
    });
  }

  if (step === "category") {
    return (
      <CategoryStep
        form={form}
        visualStep={visualStep}
        onBack={gotoBack}
        onNext={gotoNext}
        totalSteps={totalSteps}
      />
    );
  }

  if (step === "investment_type") {
    return (
      <InvestmentTypeStep
        form={form}
        visualStep={visualStep}
        onBack={gotoBack}
        onNext={gotoNext}
        totalSteps={totalSteps}
      />
    );
  }

  if (step === "details") {
    return (
      <DetailsStep
        form={form}
        visualStep={visualStep}
        onBack={gotoBack}
        onNext={gotoNext}
        nextIcon={arrowRight}
        totalSteps={totalSteps}
      />
    );
  }

  if (step === "linked_debt") {
    return (
      <LinkedDebtStep
        form={form}
        visualStep={visualStep}
        onBack={gotoBack}
        onNext={gotoNext}
        nextIcon={arrowRight}
        totalSteps={totalSteps}
      />
    );
  }

  return (
    <ConfirmStep
      form={form}
      visualStep={visualStep}
      onBack={gotoBack}
      onSubmit={handleSubmit}
      pending={pending}
      serverError={serverError}
      investmentTypeWatched={investmentType}
      totalSteps={totalSteps}
    />
  );
}
