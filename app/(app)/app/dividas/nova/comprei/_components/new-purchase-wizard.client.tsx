"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { WizardShell } from "@/app/(app)/app/_components/wizard-shell";
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
import { WhatStep } from "./steps/what-step";

// "new" = cadastrar um cartão novo inline; UUID = cartão existente; null = não escolhido.
export type CreditCardChoice = string | "new" | null;

// Plan C: quando o usuário escolhe "à vista" e ainda não tem cash asset cadastrado,
// damos a opção de criar a conta inline ("create") ou seguir sem mexer no saldo
// ("skip"). `null` = nenhuma escolha (Step 4 fica bloqueado).
export type CashOnboardingChoice = "create" | "skip" | null;

// Comportamento do valor do item ao longo do tempo. Definido silenciosamente
// pelo default por categoria na criação; não há mais step no wizard.
export type ValueBehavior = "depreciating" | "appreciating" | "stable";

export interface NewPurchaseFormValues {
  name: string;
  valueCents: bigint;
  category: PurchaseCategory | null;
  paymentMethod: PaymentMethod | null;
  valueBehavior: ValueBehavior | null;
  annualRatePct: number | null;
  fromCashAssetId: string | null;
  cashOnboarding: CashOnboardingChoice;
  cashAssetName: string;
  currentBalanceCents: bigint;
  installments: number;
  creditCardChoice: CreditCardChoice;
  newCardLabel: string;
  newCardLimitCents: bigint;
  newCardClosingDay: number;
  newCardDueDay: number;
  monthlyPaymentCents: bigint;
  downPaymentCents: bigint;
  financingAnnualRatePct: number | null;
  financingTermMonths: number;
}

// O Step 3 (comportamento de valor) foi removido do fluxo; o número 3 nunca é
// usado, mas mantemos o tipo 1..6 para não renumerar a máquina de estados.
type Step = 1 | 2 | 3 | 4 | 5 | 6;

// Categorias que geram patrimônio. Espelha CATEGORY_CONFIG do action.
const ASSET_CATEGORIES: ReadonlySet<PurchaseCategory> = new Set<PurchaseCategory>([
  "electronics",
  "furniture",
  "vehicle",
  "other",
]);

const DEFAULT_DEPRECIATION_RATE: Record<PurchaseCategory, number> = {
  electronics: 25,
  furniture: 10,
  vehicle: 15,
  other: 10,
  travel: 0,
  education: 0,
};

function titleFor(step: Step, method: PaymentMethod | null, hasCashAssets: boolean): string {
  if (step === 1) return "O que você comprou?";
  if (step === 2) return "Qual o tipo?";
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

// Como o Step 3 não existe, os passos internos 4..6 aparecem como 3..5 na barra.
function visibleStepInfo(step: Step): { currentStep: 1 | 2 | 3 | 4 | 5; totalSteps: number } {
  const total = 5;
  if (step >= 4) {
    return { currentStep: (step - 1) as 1 | 2 | 3 | 4 | 5, totalSteps: total };
  }
  return { currentStep: step as 1 | 2 | 3 | 4 | 5, totalSteps: total };
}

export function NewPurchaseWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
  // useWatch assina só os campos lidos neste render (título/progresso/CTA); evita
  // re-render da wizard inteira a cada tecla, que somava lag ao avançar.
  const watchedName = useWatch({ control, name: "name" });
  const watchedValueCents = useWatch({ control, name: "valueCents" });
  const watchedPaymentMethod = useWatch({ control, name: "paymentMethod" });

  const { data: cashAssets } = useQuery<CashAssetPayload[]>({
    queryKey: ["comprei", "cash-assets"],
    queryFn: () => listCashAssetsForPurchase(),
    enabled: watchedPaymentMethod === "cash" && step >= 5,
    staleTime: 30_000,
  });
  const { data: creditCards } = useQuery<CreditCardDebtPayload[]>({
    queryKey: ["comprei", "credit-cards"],
    queryFn: () => listCreditCardsForPurchase(),
    enabled: watchedPaymentMethod === "credit_card" && step >= 5,
    staleTime: 30_000,
  });

  const hasCashAssets = (cashAssets ?? []).length > 0;

  function selectCategory(category: PurchaseCategory) {
    setValue("category", category, { shouldDirty: true });
    if (ASSET_CATEGORIES.has(category)) {
      setValue("valueBehavior", "depreciating", { shouldDirty: true });
      setValue("annualRatePct", DEFAULT_DEPRECIATION_RATE[category], { shouldDirty: true });
    } else {
      setValue("valueBehavior", null, { shouldDirty: true });
      setValue("annualRatePct", null, { shouldDirty: true });
    }
    setStep(4);
  }

  function selectMethod(method: PaymentMethod) {
    setValue("paymentMethod", method, { shouldDirty: true });
    // Limpa o estado do método anterior pra não vazar quando o usuário volta e troca.
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
    const method = getValues("paymentMethod");
    if (method === "cash") {
      setValue("fromCashAssetId", id, { shouldDirty: true });
    } else if (method === "credit_card") {
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

  function validateStep5(): string | null {
    const v = getValues();
    if (v.paymentMethod === "cash") {
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
        // Lista de cartões vazia: o details-step mostra o form direto sem o picker,
        // então creditCardChoice fica null e validamos o new-card form mesmo assim.
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

  function goToStep6() {
    const err = validateStep5();
    if (err) {
      setServerError(err);
      return;
    }
    setServerError(null);
    setStep(6);
  }

  function backFromStep4() {
    setStep(2);
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

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["debts"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboardSnapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["netWorth"] }),
        queryClient.invalidateQueries({ queryKey: ["assetsWithAllocations"] }),
      ]);

      if (result.data.assetId) {
        router.push(`/app/patrimonio/${result.data.assetId}` as Route);
        return;
      }
      if (result.data.debtId) {
        router.push(`/app/dividas/${result.data.debtId}` as Route);
        return;
      }
      router.push("/app" as Route);
    });
  }

  const title = titleFor(step, watchedPaymentMethod, hasCashAssets);
  const description = descriptionFor(step, watchedPaymentMethod, hasCashAssets);
  const { currentStep, totalSteps } = visibleStepInfo(step);

  if (step === 1) {
    return (
      <WizardShell
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={title}
        description={description}
        onBack={() => router.push("/app/dividas/nova" as Route)}
        primary={{
          label: "Continuar",
          onClick: goToStep2,
          disabled:
            !watchedName ||
            watchedName.trim().length === 0 ||
            typeof watchedValueCents !== "bigint" ||
            watchedValueCents <= 0n,
        }}
      >
        <WhatStep control={control} register={register} errors={formState.errors} />
        {serverError ? (
          <div
            role="alert"
            className="mt-2 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
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
            className="mt-2 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
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
        values={getValues()}
        cashAssets={cashAssets}
        creditCards={creditCards}
        serverError={serverError}
      />
    </WizardShell>
  );
}
