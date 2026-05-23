"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { WizardShell } from "../../_components/wizard-shell";
import {
  createPurchaseAction,
  type PaymentMethod,
  type PurchaseCategory,
} from "../_actions/create-purchase.action";
import {
  listCashAssetsForPurchase,
  type CashAssetPayload,
} from "../_actions/list-cash-assets.action";
import {
  listCreditCardsForPurchase,
  type CreditCardDebtPayload,
} from "../_actions/list-credit-cards.action";

import { CategoryStep } from "./steps/category-step";
import { ConfirmStep } from "./steps/confirm-step";
import { DetailsStep } from "./steps/details-step";
import { HowStep } from "./steps/how-step";
import { ValueBehaviorStep } from "./steps/value-behavior-step";
import { WhatStep } from "./steps/what-step";

// "new" sinaliza que o usuário escolheu cadastrar um cartão novo inline. UUIDs
// são tratados como ids de cartões existentes. null = não escolhido ainda.
export type CreditCardChoice = string | "new" | null;

// Plan C: quando o usuário escolhe "à vista" e ainda não tem cash asset cadastrado,
// damos a opção de criar a conta inline ("create") ou seguir sem mexer no saldo
// ("skip"). `null` = nenhuma escolha (Step 4 fica bloqueado).
export type CashOnboardingChoice = "create" | "skip" | null;

// Comportamento do valor do item ao longo do tempo. Substitui o auto-mapping
// por categoria; agora o usuário escolhe explicitamente.
export type ValueBehavior = "depreciating" | "appreciating" | "stable";

export interface NewPurchaseFormValues {
  name: string;
  valueCents: bigint;
  category: PurchaseCategory | null;
  paymentMethod: PaymentMethod | null;
  // value behavior (Step 3, só pra categorias que geram patrimônio)
  valueBehavior: ValueBehavior | null;
  annualRatePct: number | null;
  // cash
  fromCashAssetId: string | null;
  cashOnboarding: CashOnboardingChoice;
  cashAssetName: string;
  currentBalanceCents: bigint;
  // credit_card
  installments: number;
  creditCardChoice: CreditCardChoice;
  newCardLabel: string;
  newCardLimitCents: bigint;
  newCardClosingDay: number;
  newCardDueDay: number;
  // loan
  monthlyPaymentCents: bigint;
  // financing (casa/carro)
  downPaymentCents: bigint;
  financingAnnualRatePct: number | null;
  financingTermMonths: number;
}

// Passos internos. Quando a categoria não gera patrimônio (travel/education),
// o Step 3 é pulado mas a numeração interna continua 1..6 para mantermos uma
// máquina de estados simples. A renderização visual usa um índice mapeado.
type Step = 1 | 2 | 3 | 4 | 5 | 6;

// Categorias que geram patrimônio. Espelha CATEGORY_CONFIG do action.
const ASSET_CATEGORIES: ReadonlySet<PurchaseCategory> = new Set<PurchaseCategory>([
  "electronics",
  "furniture",
  "vehicle",
  "other",
]);

// Default da taxa de depreciação por categoria (% positivo).
const DEFAULT_DEPRECIATION_RATE: Record<PurchaseCategory, number> = {
  electronics: 25,
  furniture: 10,
  vehicle: 15,
  other: 10,
  travel: 0,
  education: 0,
};

function generatesAsset(category: PurchaseCategory | null): boolean {
  return category !== null && ASSET_CATEGORIES.has(category);
}

function titleFor(step: Step, method: PaymentMethod | null, hasCashAssets: boolean): string {
  if (step === 1) return "O que você comprou?";
  if (step === 2) return "Qual o tipo?";
  if (step === 3) return "Como o valor desse item se comporta?";
  if (step === 4) return "Como você pagou?";
  if (step === 5) {
    if (method === "cash") {
      return hasCashAssets ? "De qual conta?" : "Cadastrar conta?";
    }
    if (method === "credit_card") return "Em quantas vezes?";
    if (method === "loan") return "Detalhes do empréstimo";
    if (method === "financing") return "Detalhes do financiamento";
    return "Detalhes";
  }
  return "Tudo certo?";
}

function descriptionFor(step: Step, method: PaymentMethod | null, hasCashAssets: boolean): string {
  if (step === 1) return "Nome e valor.";
  if (step === 2) return "Categoria da compra.";
  if (step === 3) return "A maioria das coisas perde valor com o tempo, mas tem exceções.";
  if (step === 4) return "Como saiu o dinheiro.";
  if (step === 5) {
    if (method === "cash") {
      return hasCashAssets ? "Escolha a conta que pagou." : "Cadastre sua conta na hora ou pule.";
    }
    if (method === "credit_card") return "Parcelas e qual cartão.";
    if (method === "loan") return "Parcelas e valor mensal.";
    if (method === "financing") return "Entrada, parcelas e taxa anual.";
    return "Vamos registrar essa compra.";
  }
  return "Confira antes de salvar.";
}

// Mapeia o step interno para a posição visível na barra de progresso. Quando o
// Step 3 está pulado, os passos 4..6 aparecem como 3..5.
function visibleStepInfo(
  step: Step,
  category: PurchaseCategory | null,
): { currentStep: 1 | 2 | 3 | 4 | 5 | 6; totalSteps: number } {
  const includesBehavior = generatesAsset(category);
  const total = includesBehavior ? 6 : 5;
  if (!includesBehavior && step >= 4) {
    return { currentStep: (step - 1) as 1 | 2 | 3 | 4 | 5, totalSteps: total };
  }
  return { currentStep: step, totalSteps: total };
}

export function NewPurchaseWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<NewPurchaseFormValues>({
    defaultValues: {
      name: "",
      valueCents: 0n as unknown as bigint,
      category: null,
      paymentMethod: null,
      valueBehavior: null,
      annualRatePct: null,
      fromCashAssetId: null,
      cashOnboarding: null,
      cashAssetName: "Conta corrente",
      currentBalanceCents: 0n as unknown as bigint,
      installments: 1,
      creditCardChoice: null,
      newCardLabel: "",
      newCardLimitCents: 0n as unknown as bigint,
      newCardClosingDay: 5,
      newCardDueDay: 15,
      monthlyPaymentCents: 0n as unknown as bigint,
      downPaymentCents: 0n as unknown as bigint,
      financingAnnualRatePct: null,
      financingTermMonths: 240,
    },
  });

  const { control, register, watch, formState, getValues, setValue } = form;
  const values = watch();

  // Pre-fetch listas no step 5 para construir o resumo. Tem cache via useQuery, então
  // se um step anterior já fetchou, isso vira no-op.
  const { data: cashAssets } = useQuery<CashAssetPayload[]>({
    queryKey: ["comprei", "cash-assets"],
    queryFn: () => listCashAssetsForPurchase(),
    enabled: values.paymentMethod === "cash" && step >= 5,
    staleTime: 30_000,
  });
  const { data: creditCards } = useQuery<CreditCardDebtPayload[]>({
    queryKey: ["comprei", "credit-cards"],
    queryFn: () => listCreditCardsForPurchase(),
    enabled: values.paymentMethod === "credit_card" && step >= 5,
    staleTime: 30_000,
  });

  const hasCashAssets = (cashAssets ?? []).length > 0;

  function selectCategory(category: PurchaseCategory) {
    setValue("category", category, { shouldDirty: true });
    if (ASSET_CATEGORIES.has(category)) {
      // Pré-popula behavior=depreciating + taxa default para reduzir fricção.
      // O usuário pode trocar se quiser.
      setValue("valueBehavior", "depreciating", { shouldDirty: true });
      setValue("annualRatePct", DEFAULT_DEPRECIATION_RATE[category], { shouldDirty: true });
      setStep(3);
    } else {
      // travel/education: skip Step 3.
      setValue("valueBehavior", null, { shouldDirty: true });
      setValue("annualRatePct", null, { shouldDirty: true });
      setStep(4);
    }
  }

  function selectValueBehavior(behavior: ValueBehavior) {
    setValue("valueBehavior", behavior, { shouldDirty: true });
    const cat = getValues("category");
    if (behavior === "stable") {
      setValue("annualRatePct", 0, { shouldDirty: true });
    } else if (behavior === "appreciating") {
      // Default 3% pra appreciation.
      const current = getValues("annualRatePct");
      if (current === null || current === undefined || current === 0) {
        setValue("annualRatePct", 3, { shouldDirty: true });
      }
    } else {
      // depreciating: usa default por categoria se ainda não preencheu.
      const current = getValues("annualRatePct");
      if (current === null || current === undefined || current === 0) {
        const def = cat ? DEFAULT_DEPRECIATION_RATE[cat] : 10;
        setValue("annualRatePct", def, { shouldDirty: true });
      }
    }
  }

  function selectMethod(method: PaymentMethod) {
    setValue("paymentMethod", method, { shouldDirty: true });
    // Reset defaults relevantes pra evitar leaked state quando o usuário volta e troca.
    if (method !== "cash") {
      setValue("fromCashAssetId", null, { shouldDirty: true });
      setValue("cashOnboarding", null, { shouldDirty: true });
    }
    if (method !== "credit_card") {
      setValue("creditCardChoice", null, { shouldDirty: true });
    }
    setStep(5);
  }

  function selectCreditCardOrCashOption(id: string | null) {
    if (values.paymentMethod === "cash") {
      setValue("fromCashAssetId", id, { shouldDirty: true });
    } else if (values.paymentMethod === "credit_card") {
      setValue("creditCardChoice", id as CreditCardChoice, { shouldDirty: true });
    }
  }

  function selectCashOnboarding(choice: "create" | "skip") {
    setValue("cashOnboarding", choice, { shouldDirty: true });
  }

  function validateStep1(): string | null {
    const v = getValues();
    if (!v.name || v.name.trim().length === 0) return "Informe o nome da compra.";
    if (typeof v.valueCents !== "bigint" || v.valueCents <= 0n) return "Informe o valor da compra.";
    return null;
  }

  function validateStep3(): string | null {
    const v = getValues();
    if (!v.valueBehavior) return "Escolha como o valor se comporta.";
    if (v.valueBehavior === "stable") return null;
    const rate = v.annualRatePct;
    if (rate === null || rate === undefined || !Number.isFinite(rate)) {
      return "Informe a taxa anual.";
    }
    if (rate <= 0) return "A taxa deve ser maior que zero.";
    if (rate > 100) return "A taxa deve ser no máximo 100%.";
    return null;
  }

  function validateStep5(): string | null {
    const v = getValues();
    if (v.paymentMethod === "cash") {
      // Se tem cash asset existente selecionado, ok. Sem cash assets, exigimos uma
      // escolha (create ou skip). Se "create", exigimos name + balance preenchidos.
      if (v.fromCashAssetId) return null;
      if (hasCashAssets) return null;
      if (!v.cashOnboarding) {
        return "Escolha cadastrar a conta agora ou pular.";
      }
      if (v.cashOnboarding === "create") {
        if (!v.cashAssetName || v.cashAssetName.trim().length === 0) {
          return "Informe o nome da conta.";
        }
        if (typeof v.currentBalanceCents !== "bigint" || v.currentBalanceCents < 0n) {
          return "Informe o saldo atual da conta.";
        }
      }
      return null;
    }
    if (v.paymentMethod === "credit_card") {
      const inst = v.installments;
      if (!Number.isFinite(inst) || inst < 1 || inst > 60) {
        return "Informe um número de parcelas entre 1 e 60.";
      }
      if (!v.creditCardChoice) {
        // Lista vazia: o details-step mostra o form direto sem o picker, então
        // creditCardChoice fica null. Aceitamos e validamos o new-card form abaixo.
        if (!v.newCardLabel || v.newCardLabel.trim().length === 0) {
          return "Informe o nome do novo cartão.";
        }
        if (typeof v.newCardLimitCents !== "bigint" || v.newCardLimitCents <= 0n) {
          return "Informe o limite do cartão.";
        }
        return null;
      }
      if (v.creditCardChoice === "new") {
        if (!v.newCardLabel || v.newCardLabel.trim().length === 0) {
          return "Informe o nome do novo cartão.";
        }
        if (typeof v.newCardLimitCents !== "bigint" || v.newCardLimitCents <= 0n) {
          return "Informe o limite do cartão.";
        }
      }
      return null;
    }
    if (v.paymentMethod === "loan") {
      const inst = v.installments;
      if (!Number.isFinite(inst) || inst < 1 || inst > 360) {
        return "Informe um número de parcelas entre 1 e 360.";
      }
      if (typeof v.monthlyPaymentCents !== "bigint" || v.monthlyPaymentCents <= 0n) {
        return "Informe o valor da parcela.";
      }
      return null;
    }
    if (v.paymentMethod === "financing") {
      const term = v.financingTermMonths;
      if (!Number.isFinite(term) || term < 1 || term > 420) {
        return "Informe um número de parcelas entre 1 e 420.";
      }
      const rate = v.financingAnnualRatePct;
      if (rate === null || rate === undefined || !Number.isFinite(rate) || rate < 0 || rate > 100) {
        return "Informe a taxa anual (0 a 100%).";
      }
      if (typeof v.downPaymentCents !== "bigint" || v.downPaymentCents < 0n) {
        return "Informe a entrada (pode ser zero).";
      }
      if (v.downPaymentCents >= v.valueCents) {
        return "A entrada deve ser menor que o valor da compra.";
      }
      return null;
    }
    return null;
  }

  function goToStep2() {
    const err = validateStep1();
    if (err) {
      setServerError(err);
      return;
    }
    setServerError(null);
    setStep(2);
  }

  function goToStep4FromBehavior() {
    const err = validateStep3();
    if (err) {
      setServerError(err);
      return;
    }
    setServerError(null);
    setStep(4);
  }

  function goToStep6() {
    const err = validateStep5();
    if (err) {
      setServerError(err);
      return;
    }
    setServerError(null);
    setStep(6);
  }

  // Step 5 back: volta pra Step 4 (how) sempre.
  // Step 4 back: se categoria gera asset, volta pra Step 3 (behavior). Senão, volta pra Step 2.
  function backFromStep4() {
    const cat = getValues("category");
    setStep(generatesAsset(cat) ? 3 : 2);
  }

  async function handleSubmit() {
    setServerError(null);
    const v = getValues();
    if (!v.category) {
      setServerError("Escolha uma categoria.");
      return;
    }
    if (!v.paymentMethod) {
      setServerError("Escolha como pagou.");
      return;
    }

    startTransition(async () => {
      const useExisting =
        v.paymentMethod === "credit_card" &&
        v.creditCardChoice !== null &&
        v.creditCardChoice !== "new";
      const useNewCard =
        v.paymentMethod === "credit_card" &&
        (v.creditCardChoice === "new" ||
          (!useExisting && (v.newCardLabel ?? "").trim().length > 0));

      const isCashCreate =
        v.paymentMethod === "cash" && !v.fromCashAssetId && v.cashOnboarding === "create";

      const result = await createPurchaseAction({
        name: v.name.trim(),
        valueCents: v.valueCents.toString(),
        category: v.category!,
        paymentMethod: v.paymentMethod!,
        ...(v.valueBehavior !== null ? { valueBehavior: v.valueBehavior } : {}),
        ...(v.annualRatePct !== null ? { annualRatePct: v.annualRatePct } : {}),
        fromCashAssetId: v.paymentMethod === "cash" ? (v.fromCashAssetId ?? null) : null,
        ...(v.paymentMethod === "cash" && !v.fromCashAssetId && v.cashOnboarding
          ? { cashOnboarding: v.cashOnboarding }
          : {}),
        ...(isCashCreate
          ? {
              cashAssetName: v.cashAssetName.trim(),
              currentBalanceCents: v.currentBalanceCents.toString(),
            }
          : {}),
        installments:
          v.paymentMethod === "credit_card" || v.paymentMethod === "loan"
            ? v.installments
            : undefined,
        creditCardDebtId: useExisting ? (v.creditCardChoice as string) : null,
        newCreditCard: useNewCard
          ? {
              cardLabel: v.newCardLabel,
              creditLimitCents: v.newCardLimitCents.toString(),
              closingDay: v.newCardClosingDay,
              dueDay: v.newCardDueDay,
            }
          : null,
        monthlyPaymentCents:
          v.paymentMethod === "loan" ? v.monthlyPaymentCents.toString() : undefined,
        ...(v.paymentMethod === "financing"
          ? {
              downPaymentCents: v.downPaymentCents.toString(),
              financingAnnualRatePct: v.financingAnnualRatePct ?? 0,
              financingTermMonths: v.financingTermMonths,
            }
          : {}),
      });

      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      if (result.assetId) {
        router.push(`/app/patrimonio/${result.assetId}` as Route);
        return;
      }
      if (result.debtId) {
        router.push(`/app/dividas/${result.debtId}` as Route);
        return;
      }
      router.push("/app" as Route);
    });
  }

  const title = titleFor(step, values.paymentMethod, hasCashAssets);
  const description = descriptionFor(step, values.paymentMethod, hasCashAssets);
  const { currentStep, totalSteps } = visibleStepInfo(step, values.category);

  if (step === 1) {
    return (
      <WizardShell
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={title}
        description={description}
        onBack={() => router.push("/app" as Route)}
        primary={{
          label: "Continuar",
          onClick: goToStep2,
          disabled:
            !values.name ||
            values.name.trim().length === 0 ||
            typeof values.valueCents !== "bigint" ||
            values.valueCents <= 0n,
        }}
      >
        <WhatStep control={control} register={register} errors={formState.errors} />
        {serverError ? (
          <div
            role="alert"
            className="mt-2 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[13px] text-[color:var(--semantic-negative)]"
          >
            {serverError}
          </div>
        ) : null}
      </WizardShell>
    );
  }

  if (step === 2) {
    return (
      <WizardShell
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={title}
        description={description}
        onBack={() => setStep(1)}
      >
        <CategoryStep onSelectCategory={selectCategory} />
      </WizardShell>
    );
  }

  if (step === 3) {
    return (
      <WizardShell
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={title}
        description={description}
        onBack={() => setStep(2)}
        primary={{
          label: "Continuar",
          onClick: goToStep4FromBehavior,
          disabled: !values.valueBehavior,
        }}
      >
        <ValueBehaviorStep
          control={control}
          errors={formState.errors}
          selected={values.valueBehavior}
          onSelectBehavior={selectValueBehavior}
        />
        {serverError ? (
          <div
            role="alert"
            className="mt-2 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[13px] text-[color:var(--semantic-negative)]"
          >
            {serverError}
          </div>
        ) : null}
      </WizardShell>
    );
  }

  if (step === 4) {
    return (
      <WizardShell
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={title}
        description={description}
        onBack={backFromStep4}
      >
        <HowStep onSelectMethod={selectMethod} />
      </WizardShell>
    );
  }

  if (step === 5) {
    return (
      <WizardShell
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={title}
        description={description}
        onBack={() => setStep(4)}
        primary={{
          label: "Continuar",
          onClick: goToStep6,
        }}
      >
        <DetailsStep
          control={control}
          register={register}
          errors={formState.errors}
          watch={watch}
          onSelectCreditCardOption={selectCreditCardOrCashOption}
          onSelectCashOnboarding={selectCashOnboarding}
        />
        {serverError ? (
          <div
            role="alert"
            className="mt-2 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[13px] text-[color:var(--semantic-negative)]"
          >
            {serverError}
          </div>
        ) : null}
      </WizardShell>
    );
  }

  return (
    <WizardShell
      currentStep={currentStep}
      totalSteps={totalSteps}
      title={title}
      description={description}
      onBack={() => setStep(5)}
      primary={{
        label: "Confirmar",
        onClick: () => {
          void handleSubmit();
        },
        disabled: pending,
        loading: pending,
      }}
    >
      <ConfirmStep
        values={values}
        cashAssets={cashAssets}
        creditCards={creditCards}
        serverError={serverError}
      />
    </WizardShell>
  );
}
