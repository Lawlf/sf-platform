"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";

import { Spinner } from "@/app/components/ui/spinner";
import type { Currency } from "@/domain/value-objects/money.vo";

import { HowItWorksSheet } from "../../../../_components/how-it-works-sheet";
import { parseFinancingSeed } from "../../../../simular/_lib/financing-seed";
import { createDebtAction } from "../../../_actions/create-debt.action";
import { todayIso } from "@/shared/format/dates";
import { formatCentsBRL } from "../../../_lib/format";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { createAssetForDebtAction } from "../../_actions/create-asset-for-debt.action";
import { linkDebtToAssetAction } from "../../_actions/link-debt-to-asset.action";
import { BankCombobox } from "../../_components/bank-combobox";
import { ComputedCard } from "../../_components/computed-card";
import {
  canAdvanceLinkAssetStep,
  LinkAssetStepContent,
  validateLinkAssetStep,
} from "../../_components/link-asset-step";
import { ScenarioPicker } from "../../_components/scenario-picker";
import { SummaryList } from "../../_components/summary-list";
import { WizardField, wizardInputClass } from "@/ui/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardPercentField } from "../../_components/wizard-percent-field";
import { WizardRadioCard } from "@/ui/wizard-radio-card";
import { WizardShell } from "../../_components/wizard-shell";
import { buildLinkSummary, debtCreatedHref, linkAssetDefaultsFor } from "../../_lib/link-asset";
import {
  NEW_STEP2_FIELDS,
  ONGOING_STEP2_FIELDS,
  STEP3_FIELDS,
  financingFormSchema,
  type FinancingFormValues,
} from "../_schema";
import { previewInstallmentAction, type PreviewResult } from "../preview-installment.action";

import { buildFinancingSummary } from "./financing-summary";

type FormValues = FinancingFormValues;


type Step = 2 | 3 | 4 | 5;

interface FinancingFormProps {
  initialScenario?: "new" | "ongoing";
  defaultCurrency?: Currency;
  initialLinkAssetId?: string | null;
}

export function FinancingForm({
  initialScenario = "new",
  defaultCurrency = "BRL",
  initialLinkAssetId = null,
}: FinancingFormProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  // Vindo do simulador de financiamento (Price vs SAC): pré-preenche valor, taxa
  // e prazo no cenário "novo" para a pessoa só conferir e cadastrar.
  const seed =
    initialScenario === "new"
      ? parseFinancingSeed(Object.fromEntries(searchParams.entries()))
      : null;
  const [step, setStep] = useState<Step>(2);
  // "ongoing" pedia muitos campos numa tela. Split em 2 sub-páginas dentro do
  // step 2: A = valores (refine currentBalance<=original exige os dois juntos),
  // B = taxa + contagens de parcela.
  const [ongoingStep, setOngoingStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [bank, setBank] = useState("");

  const labelId = useId();
  const bankId = useId();
  const termId = useId();
  const rateId = useId();
  const principalId = useId();
  const balanceId = useId();
  const paidId = useId();
  const remainingId = useId();
  const startDateId = useId();
  const insuranceId = useId();
  const adminFeeId = useId();
  const installmentId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(financingFormSchema),
    defaultValues:
      initialScenario === "ongoing"
        ? ({
            scenario: "ongoing",
            currency: defaultCurrency,
            label: "Financiamento",
            originalPrincipalCents: 0n as unknown as bigint,
            amountPaidCents: 0n as unknown as bigint,
            currentBalanceCents: 0n as unknown as bigint,
            annualRatePct: 0,
            paidInstallments: 0,
            remainingTerms: undefined as unknown as number,
            monthlyInstallmentCents: null,
            amortizationMethod: "PRICE",
            monthlyInsuranceCents: null,
            monthlyAdminFeeCents: null,
            startDate: todayIso(),
            expectedEndDate: null,
            notes: null,
            ...linkAssetDefaultsFor(initialLinkAssetId),
          } as FormValues)
        : ({
            scenario: "new",
            currency: defaultCurrency,
            label: "Financiamento",
            principalCents: (seed ? BigInt(seed.principalCents) : 0n) as unknown as bigint,
            annualRatePct: seed?.annualRatePct ?? 0,
            termMonths: seed?.termMonths ?? 60,
            monthlyInstallmentCents: null,
            amortizationMethod: "PRICE",
            monthlyInsuranceCents: null,
            monthlyAdminFeeCents: null,
            startDate: todayIso(),
            expectedEndDate: null,
            notes: null,
            ...linkAssetDefaultsFor(initialLinkAssetId),
          } as FormValues),
  });

  const values = form.watch();
  const errors = form.formState.errors;
  const scenario = values.scenario;
  const currency: Currency = values.currency ?? defaultCurrency;

  useEffect(() => {
    if (values.scenario !== "ongoing") return;
    const original = values.originalPrincipalCents ?? 0n;
    const paid = values.amountPaidCents ?? 0n;
    const balance = original > paid ? original - paid : 0n;
    if ((values.currentBalanceCents ?? 0n) !== balance) {
      form.setValue("currentBalanceCents" as never, balance as never, { shouldValidate: false });
    }
  }, [values, form]);

  function selectScenario(next: "new" | "ongoing") {
    if (next === scenario) return;
    setOngoingStep(1);
    // Trocar de cenário preserva o que serve pros dois (nome, parcela, taxa,
    // seguro, tarifa, datas). Só os campos específicos do cenário antigo somem.
    const shared = {
      currency: values.currency ?? defaultCurrency,
      label: values.label ?? "",
      annualRatePct: values.annualRatePct ?? 0,
      monthlyInstallmentCents: values.monthlyInstallmentCents ?? null,
      amortizationMethod: values.amortizationMethod ?? "PRICE",
      monthlyInsuranceCents: values.monthlyInsuranceCents ?? null,
      monthlyAdminFeeCents: values.monthlyAdminFeeCents ?? null,
      startDate: values.startDate ?? todayIso(),
      expectedEndDate: values.expectedEndDate ?? null,
      notes: values.notes ?? null,
    };
    if (next === "new") {
      form.reset(
        {
          scenario: "new",
          ...shared,
          principalCents: 0n as unknown as bigint,
          termMonths: 60,
          ...linkAssetDefaultsFor(initialLinkAssetId),
        } as FormValues,
        { keepErrors: false },
      );
    } else {
      form.reset(
        {
          scenario: "ongoing",
          ...shared,
          originalPrincipalCents: 0n as unknown as bigint,
          currentBalanceCents: 0n as unknown as bigint,
          paidInstallments: 0,
          remainingTerms: 60,
          ...linkAssetDefaultsFor(initialLinkAssetId),
        } as FormValues,
        { keepErrors: false },
      );
    }
  }

  // Para o preview de parcela na step 5 trabalhar com ambos cenários:
  const previewPrincipal: bigint =
    scenario === "new"
      ? ((values as Extract<FormValues, { scenario: "new" }>).principalCents ?? 0n)
      : ((values as Extract<FormValues, { scenario: "ongoing" }>).originalPrincipalCents ?? 0n);
  const previewTerm: number =
    scenario === "new"
      ? ((values as Extract<FormValues, { scenario: "new" }>).termMonths ?? 0)
      : ((values as Extract<FormValues, { scenario: "ongoing" }>).paidInstallments ?? 0) +
        ((values as Extract<FormValues, { scenario: "ongoing" }>).remainingTerms ?? 0);

  // Step 5 (confirm) preview state
  const [preview, setPreview] = useState<PreviewResult | "pending" | null>(null);

  useEffect(() => {
    if (step !== 5) return;
    const annualRatePct = values.annualRatePct;
    if (
      typeof previewPrincipal !== "bigint" ||
      previewPrincipal <= 0n ||
      typeof annualRatePct !== "number" ||
      annualRatePct < 0 ||
      typeof previewTerm !== "number" ||
      previewTerm < 1
    ) {
      setPreview(null);
      return;
    }

    setPreview("pending");
    let cancelled = false;
    previewInstallmentAction({
      principalCents: previewPrincipal.toString(),
      annualRatePct,
      termMonths: previewTerm,
      amortizationMethod: values.amortizationMethod,
      monthlyInsuranceCents: values.monthlyInsuranceCents
        ? values.monthlyInsuranceCents.toString()
        : undefined,
      monthlyAdminFeeCents: values.monthlyAdminFeeCents
        ? values.monthlyAdminFeeCents.toString()
        : undefined,
    }).then((result) => {
      if (!cancelled) setPreview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [
    step,
    previewPrincipal,
    previewTerm,
    values.annualRatePct,
    values.amortizationMethod,
    values.monthlyInsuranceCents,
    values.monthlyAdminFeeCents,
  ]);

  async function goToOngoingStep2() {
    const valid = await form.trigger([
      "label",
      "originalPrincipalCents",
      "amountPaidCents",
    ] as Parameters<typeof form.trigger>[0]);
    if (!valid) return;
    prefillInstallmentCounts();
    setOngoingStep(2);
  }

  function prefillInstallmentCounts() {
    const v = form.getValues();
    if (v.scenario !== "ongoing") return;
    const parcela = v.monthlyInstallmentCents ?? null;
    if (!parcela || parcela <= 0n) return;
    const original = v.originalPrincipalCents ?? 0n;
    const paid = v.amountPaidCents ?? 0n;
    const saldo = original > paid ? original - paid : 0n;
    const parcelaNum = Number(parcela);
    if (!v.paidInstallments) {
      const paidCount = Math.round(Number(paid) / parcelaNum);
      if (paidCount > 0) form.setValue("paidInstallments" as never, paidCount as never);
    }
    if (!v.remainingTerms || Number.isNaN(v.remainingTerms)) {
      const remainingCount = saldo > 0n ? Math.max(1, Math.ceil(Number(saldo) / parcelaNum)) : 0;
      if (remainingCount > 0) form.setValue("remainingTerms" as never, remainingCount as never);
    }
  }

  async function goToStep3() {
    const fields = (
      scenario === "new" ? NEW_STEP2_FIELDS : ONGOING_STEP2_FIELDS
    ) as readonly (keyof FormValues)[];
    const valid = await form.trigger(fields as Parameters<typeof form.trigger>[0]);
    if (valid) setStep(3);
  }

  async function goToStep4() {
    const valid = await form.trigger(STEP3_FIELDS);
    if (valid) setStep(4);
  }

  function goToStep5() {
    setStep(5);
  }

  async function handleSubmit() {
    setServerError(null);
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();

    const linkErr = validateLinkAssetStep(v);
    if (linkErr) {
      setServerError(linkErr);
      return;
    }

    const fd = new FormData();
    fd.set("label", v.label);
    fd.set("currency", v.currency);

    let principalForServer: bigint;
    let termMonthsForServer: number;
    let currentBalanceForServer: bigint | null = null;
    let paidInstallmentsForServer: number | null = null;

    if (v.scenario === "new") {
      principalForServer = v.principalCents;
      termMonthsForServer = v.termMonths;
    } else {
      principalForServer = v.originalPrincipalCents;
      termMonthsForServer = v.paidInstallments + v.remainingTerms;
      currentBalanceForServer = v.currentBalanceCents;
      paidInstallmentsForServer = v.paidInstallments;
    }

    fd.set("principalCents", principalForServer.toString());
    fd.set("annualRatePct", v.annualRatePct ? String(v.annualRatePct) : "");
    fd.set("termMonths", String(termMonthsForServer));
    fd.set(
      "monthlyInstallmentCents",
      v.monthlyInstallmentCents ? v.monthlyInstallmentCents.toString() : "",
    );
    fd.set("amortizationMethod", v.amortizationMethod);
    fd.set(
      "monthlyInsuranceCents",
      v.monthlyInsuranceCents ? v.monthlyInsuranceCents.toString() : "",
    );
    fd.set("monthlyAdminFeeCents", v.monthlyAdminFeeCents ? v.monthlyAdminFeeCents.toString() : "");
    fd.set("startDate", v.startDate);
    fd.set("expectedEndDate", v.expectedEndDate ?? "");
    fd.set("notes", v.notes ?? "");
    if (currentBalanceForServer !== null) {
      fd.set("currentBalanceCents", currentBalanceForServer.toString());
    }
    if (paidInstallmentsForServer !== null) {
      fd.set("paidInstallments", String(paidInstallmentsForServer));
    }

    startTransition(async () => {
      // Se o usuário escolheu "novo bem", criamos o ativo primeiro. Se falhar,
      // abortamos antes de criar a dívida (evita dívida órfã).
      let assetIdToLink: string | null = null;
      if (v.linkAssetChoice === "new") {
        const r = await createAssetForDebtAction({
          category: v.newAssetCategory!,
          label: (v.newAssetLabel ?? "").trim(),
          currentValueCents: (v.newAssetCurrentValueCents ?? 0n).toString(),
          acquiredAt: v.newAssetAcquiredAt ?? null,
        });
        if (!r.ok) {
          setServerError(r.message);
          return;
        }
        assetIdToLink = r.data.assetId;
      } else if (v.linkAssetChoice === "existing") {
        assetIdToLink = v.linkedAssetId ?? null;
      }

      fd.set("kind", "financing");
      const debtRes = await createDebtAction(fd);
      if (!debtRes.ok) {
        setServerError(debtRes.message);
        return;
      }

      if (assetIdToLink) {
        const allocationCents =
          v.linkAssetChoice === "existing"
            ? (v.linkedAssetAllocationCents ?? principalForServer)
            : principalForServer;
        const linkRes = await linkDebtToAssetAction({
          assetId: assetIdToLink,
          debtId: debtRes.data.debtId,
          allocationOriginalCents: allocationCents.toString(),
        });
        if (!linkRes.ok) {
          // Dívida foi criada; só falhou o vínculo. Avisamos e seguimos para a dívida.
          setServerError(`Dívida criada, mas falha ao vincular bem: ${linkRes.message}`);
          await invalidateDebtCaches(queryClient);
          router.push(`/app/dividas/${debtRes.data.debtId}` as Route);
          return;
        }
      }

      await invalidateDebtCaches(queryClient);
      router.push(debtCreatedHref(initialLinkAssetId, debtRes.data.debtId) as Route);
    });
  }

  const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

  const totalSteps = scenario === "ongoing" ? 5 : 4;
  const detailsStepIndex = scenario === "ongoing" ? 3 : 2;
  const assetStepIndex = scenario === "ongoing" ? 4 : 3;
  const confirmStepIndex = scenario === "ongoing" ? 5 : 4;

  if (step === 2 && scenario === "ongoing" && ongoingStep === 2) {
    return (
      <WizardShell
        currentStep={2}
        totalSteps={5}
        title="Quase lá"
        description="Confere ou ajusta as parcelas do contrato."
        onBack={() => setOngoingStep(1)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToStep3();
          },
          icon: arrowRight,
        }}
      >
        <WizardField
          label="Taxa por ano (opcional)"
          htmlFor={rateId}
          error={errors.annualRatePct?.message}
          helper="Não sabe? Pode deixar em branco. A parcela mensal já basta pra contar no seu mês."
          helpLink={<HowItWorksSheet topic="cet" variant="brand" />}
        >
          <WizardPercentField
            control={form.control}
            name="annualRatePct"
            id={rateId}
            step="0.01"
            min={0}
            max={1000}
          />
        </WizardField>

        <div className="grid grid-cols-2 gap-3">
          <WizardField
            label="Parcelas já pagas"
            htmlFor={paidId}
            error={
              (errors as { paidInstallments?: { message?: string } }).paidInstallments?.message
            }
          >
            <input
              id={paidId}
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              placeholder="Ex: 12"
              {...form.register("paidInstallments" as never, { valueAsNumber: true })}
              className={wizardInputClass}
            />
          </WizardField>

          <WizardField
            label="Parcelas restantes"
            htmlFor={remainingId}
            error={(errors as { remainingTerms?: { message?: string } }).remainingTerms?.message}
          >
            <input
              id={remainingId}
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              placeholder="Ex: 48"
              {...form.register("remainingTerms" as never, { valueAsNumber: true })}
              className={wizardInputClass}
            />
          </WizardField>
        </div>
      </WizardShell>
    );
  }

  if (step === 2) {
    return (
      <WizardShell
        currentStep={1}
        totalSteps={totalSteps}
        title="Valores"
        description="Use os dados do contrato."
        onBack={() => router.push("/app/dividas/nova" as Route)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void (scenario === "ongoing" ? goToOngoingStep2() : goToStep3());
          },
          icon: arrowRight,
        }}
      >
        <ScenarioPicker
          label="Você já pagou alguma parcela desse financiamento?"
          active={scenario}
          onSelect={selectScenario}
        />

        <WizardField label="Banco (opcional)" htmlFor={bankId}>
          <BankCombobox
            id={bankId}
            value={bank}
            onChange={(b) => {
              setBank(b);
              form.setValue(
                "label" as never,
                (b.trim() ? `Financiamento ${b.trim()}` : "Financiamento") as never,
                { shouldValidate: true },
              );
            }}
            placeholder="Ex: Caixa, Itaú, Bradesco..."
          />
        </WizardField>

        <WizardField label="Nome da dívida" htmlFor={labelId} error={errors.label?.message}>
          <input
            id={labelId}
            {...form.register("label")}
            placeholder="Ex: Financiamento Caixa"
            className={wizardInputClass}
          />
        </WizardField>

        {scenario === "new" ? (
          <>
            <WizardField
              label="Valor financiado"
              htmlFor={principalId}
              error={
                (errors as { principalCents?: { message?: string } }).principalCents?.message
              }
            >
              <WizardMoneyField
                control={form.control}
                name={"principalCents" as never}
                id={principalId}
                placeholder="R$ 0,00"
                currency={currency}
                onCurrencyChange={(c) => form.setValue("currency" as never, c as never)}
              />
            </WizardField>

            <WizardField
              label="Taxa por ano (opcional)"
              htmlFor={rateId}
              error={errors.annualRatePct?.message}
              helper="Não sabe? Pode deixar em branco. A parcela mensal já basta pra contar no seu mês."
              helpLink={<HowItWorksSheet topic="cet" variant="brand" />}
            >
              <WizardPercentField
                control={form.control}
                name="annualRatePct"
                id={rateId}
                step="0.01"
                min={0}
                max={1000}
              />
            </WizardField>

            <WizardField
              label="Parcela mensal (opcional)"
              htmlFor={installmentId}
              error={
                (errors as { monthlyInstallmentCents?: { message?: string } })
                  .monthlyInstallmentCents?.message
              }
              helper="Se não souber a taxa, informe a parcela que você paga."
            >
              <WizardMoneyField
                control={form.control}
                name={"monthlyInstallmentCents" as never}
                id={installmentId}
                placeholder="R$ 0,00"
                currency={currency}
              />
            </WizardField>

            <WizardField
              label="Prazo (meses)"
              htmlFor={termId}
              error={(errors as { termMonths?: { message?: string } }).termMonths?.message}
            >
              <input
                id={termId}
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                {...form.register("termMonths" as never, { valueAsNumber: true })}
                className={wizardInputClass}
              />
            </WizardField>
          </>
        ) : (
          <>
            <WizardField
              label="Valor original financiado"
              htmlFor={principalId}
              error={
                (errors as { originalPrincipalCents?: { message?: string } })
                  .originalPrincipalCents?.message
              }
              helper="No contrato. Total financiado, não o que sobrou."
            >
              <WizardMoneyField
                control={form.control}
                name={"originalPrincipalCents" as never}
                id={principalId}
                placeholder="R$ 0,00"
                currency={currency}
                onCurrencyChange={(c) => form.setValue("currency" as never, c as never)}
              />
            </WizardField>

            <WizardField
              label="Quanto você já pagou"
              htmlFor={balanceId}
              error={
                (errors as { amountPaidCents?: { message?: string } }).amountPaidCents?.message
              }
              helper="Some o que já saiu até aqui. A gente calcula quanto falta."
            >
              <WizardMoneyField
                control={form.control}
                name={"amountPaidCents" as never}
                id={balanceId}
                placeholder="R$ 0,00"
                currency={currency}
              />
            </WizardField>

            <WizardField
              label="Parcela mensal (opcional)"
              htmlFor={installmentId}
              error={
                (errors as { monthlyInstallmentCents?: { message?: string } })
                  .monthlyInstallmentCents?.message
              }
              helper="Se não souber a taxa, informe a parcela que você paga."
            >
              <WizardMoneyField
                control={form.control}
                name={"monthlyInstallmentCents" as never}
                id={installmentId}
                placeholder="R$ 0,00"
                currency={currency}
              />
            </WizardField>
          </>
        )}
      </WizardShell>
    );
  }

  if (step === 3) {
    return (
      <WizardShell
        currentStep={detailsStepIndex}
        totalSteps={totalSteps}
        title="Detalhes"
        description="Como é a parcela e taxas extras."
        onBack={() => {
          setStep(2);
          if (scenario === "ongoing") setOngoingStep(2);
        }}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToStep4();
          },
          icon: arrowRight,
        }}
      >
        <Controller
          control={form.control}
          name="amortizationMethod"
          render={({ field }) => (
            <WizardField
              label="Como é a parcela?"
              helpLink={<HowItWorksSheet topic="price-vs-sac" variant="brand" />}
            >
              <div className="grid grid-cols-2 gap-2">
                <WizardRadioCard
                  title="Parcela fixa"
                  description="Não muda do começo ao fim"
                  active={field.value === "PRICE"}
                  onSelect={() => field.onChange("PRICE")}
                />
                <WizardRadioCard
                  title="Parcela que diminui"
                  description="Começa maior e vai caindo"
                  active={field.value === "SAC"}
                  onSelect={() => field.onChange("SAC")}
                />
              </div>
            </WizardField>
          )}
        />

        <WizardField label="Data de início" htmlFor={startDateId} error={errors.startDate?.message}>
          <input
            id={startDateId}
            type="date"
            {...form.register("startDate")}
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField
          label="Seguro mensal (opcional)"
          htmlFor={insuranceId}
          error={errors.monthlyInsuranceCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="monthlyInsuranceCents"
            id={insuranceId}
            placeholder="R$ 0,00"
            currency={currency}
          />
        </WizardField>

        <WizardField
          label="Taxa administrativa mensal (opcional)"
          htmlFor={adminFeeId}
          error={errors.monthlyAdminFeeCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="monthlyAdminFeeCents"
            id={adminFeeId}
            placeholder="R$ 0,00"
            currency={currency}
          />
        </WizardField>
      </WizardShell>
    );
  }

  if (step === 4) {
    const canAdvance = canAdvanceLinkAssetStep(values);
    return (
      <WizardShell
        currentStep={assetStepIndex}
        totalSteps={totalSteps}
        title="Esse compromisso é por causa de um bem?"
        description="Carro, imóvel ou outro patrimônio. Você pode pular e vincular depois."
        onBack={() => setStep(3)}
        primary={
          canAdvance
            ? {
                label: "Próximo",
                onClick: goToStep5,
                icon: arrowRight,
              }
            : undefined
        }
      >
        <LinkAssetStepContent
          form={form}
          debtPrincipalCents={previewPrincipal}
          enabled={step === 4}
        />
      </WizardShell>
    );
  }

  // step 5
  const systemLabel = values.amortizationMethod === "PRICE" ? "parcela fixa" : "parcela que cai";

  const ongoingRemaining =
    scenario === "ongoing"
      ? ((values as Extract<FormValues, { scenario: "ongoing" }>).remainingTerms ?? 0)
      : 0;
  const ongoingBalance =
    scenario === "ongoing"
      ? ((values as Extract<FormValues, { scenario: "ongoing" }>).currentBalanceCents ?? 0n)
      : 0n;
  const typedInstallment = values.monthlyInstallmentCents ?? null;
  const ongoingInstallmentCents: bigint | null =
    typedInstallment && typedInstallment > 0n
      ? typedInstallment
      : ongoingRemaining > 0 && ongoingBalance > 0n
        ? ongoingBalance / BigInt(ongoingRemaining)
        : null;

  const installmentText: ReactNode =
    scenario === "ongoing" ? (
      ongoingInstallmentCents !== null ? (
        formatCentsBRL(ongoingInstallmentCents)
      ) : (
        "Informe sua parcela ou quantas faltam"
      )
    ) : preview === "pending" || preview === null ? (
      <Spinner size={20} decorative />
    ) : preview.ok ? (
      preview.firstInstallmentFormatted
    ) : (
      "Não foi possível calcular"
    );

  const computedSub =
    scenario === "ongoing"
      ? `por ${ongoingRemaining > 0 ? ongoingRemaining : "?"} meses · ${systemLabel}`
      : preview && preview !== "pending" && preview.ok
        ? preview.isFixed
          ? `por ${previewTerm} meses · ${systemLabel}`
          : `1ª parcela · ${previewTerm} meses · ${systemLabel}`
        : `por ${previewTerm} meses · ${systemLabel}`;

  const totalPaidValue: ReactNode =
    scenario === "ongoing" ? (
      ongoingInstallmentCents !== null && ongoingRemaining > 0 ? (
        formatCentsBRL(ongoingInstallmentCents * BigInt(ongoingRemaining))
      ) : (
        formatCentsBRL(ongoingBalance)
      )
    ) : preview && preview !== "pending" && preview.ok ? (
      preview.totalPaidFormatted
    ) : (
      <Spinner size={16} decorative />
    );

  const cetValue: ReactNode =
    preview && preview !== "pending" && preview.ok ? (
      (preview.cetAnnualFormatted ?? "Não foi possível calcular")
    ) : (
      <Spinner size={16} decorative />
    );

  const linkSummary = buildLinkSummary(values);
  const summaryItems = buildFinancingSummary({ values, totalPaidValue, cetValue, linkSummary });

  return (
    <WizardShell
      currentStep={confirmStepIndex}
      totalSteps={totalSteps}
      title="Confirme os dados"
      description="Confere os números e salva."
      onBack={() => setStep(4)}
      primary={{
        label: "Salvar dívida",
        onClick: () => {
          void handleSubmit();
        },
        disabled: pending,
        loading: pending,
      }}
    >
      <ComputedCard label="Sua parcela mensal" value={installmentText} sub={computedSub} />

      <SummaryList items={summaryItems} />

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
