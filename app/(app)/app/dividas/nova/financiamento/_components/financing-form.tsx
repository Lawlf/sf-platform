"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";

import { Spinner } from "@/app/components/ui/spinner";
import { HowItWorksSheet } from "../../../../_components/how-it-works-sheet";
import { createDebtAction } from "../../../_actions/create-debt.action";
import { todayIso } from "../../../_lib/dates";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { createAssetForDebtAction } from "../../_actions/create-asset-for-debt.action";
import { linkDebtToAssetAction } from "../../_actions/link-debt-to-asset.action";
import { ComputedCard } from "../../_components/computed-card";
import {
  canAdvanceLinkAssetStep,
  LinkAssetStepContent,
  validateLinkAssetStep,
} from "../../_components/link-asset-step";
import { ScenarioPicker } from "../../_components/scenario-picker";
import { SummaryList } from "../../_components/summary-list";
import { WizardField, wizardInputClass } from "../../_components/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardPercentField } from "../../_components/wizard-percent-field";
import { WizardRadioCard } from "../../_components/wizard-radio-card";
import { WizardShell } from "../../_components/wizard-shell";
import { buildLinkSummary, linkAssetDefaults } from "../../_lib/link-asset";
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
}

export function FinancingForm({ initialScenario = "new" }: FinancingFormProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(2);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const labelId = useId();
  const termId = useId();
  const rateId = useId();
  const principalId = useId();
  const balanceId = useId();
  const paidId = useId();
  const remainingId = useId();
  const startDateId = useId();
  const insuranceId = useId();
  const adminFeeId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(financingFormSchema),
    defaultValues:
      initialScenario === "ongoing"
        ? ({
            scenario: "ongoing",
            label: "",
            originalPrincipalCents: 0n as unknown as bigint,
            currentBalanceCents: 0n as unknown as bigint,
            annualRatePct: 0,
            paidInstallments: 0,
            remainingTerms: 60,
            amortizationMethod: "PRICE",
            monthlyInsuranceCents: null,
            monthlyAdminFeeCents: null,
            startDate: todayIso(),
            expectedEndDate: null,
            notes: null,
            ...linkAssetDefaults,
          } as FormValues)
        : ({
            scenario: "new",
            label: "",
            principalCents: 0n as unknown as bigint,
            annualRatePct: 0,
            termMonths: 60,
            amortizationMethod: "PRICE",
            monthlyInsuranceCents: null,
            monthlyAdminFeeCents: null,
            startDate: todayIso(),
            expectedEndDate: null,
            notes: null,
            ...linkAssetDefaults,
          } as FormValues),
  });

  const values = form.watch();
  const errors = form.formState.errors;
  const scenario = values.scenario;

  function selectScenario(next: "new" | "ongoing") {
    if (next === scenario) return;
    if (next === "new") {
      form.reset(
        {
          scenario: "new",
          label: values.label ?? "",
          principalCents: 0n as unknown as bigint,
          annualRatePct: 0,
          termMonths: 60,
          amortizationMethod: "PRICE",
          monthlyInsuranceCents: null,
          monthlyAdminFeeCents: null,
          startDate: values.startDate ?? todayIso(),
          expectedEndDate: null,
          notes: null,
          ...linkAssetDefaults,
        } as FormValues,
        { keepErrors: false },
      );
    } else {
      form.reset(
        {
          scenario: "ongoing",
          label: values.label ?? "",
          originalPrincipalCents: 0n as unknown as bigint,
          currentBalanceCents: 0n as unknown as bigint,
          annualRatePct: 0,
          paidInstallments: 0,
          remainingTerms: 60,
          amortizationMethod: "PRICE",
          monthlyInsuranceCents: null,
          monthlyAdminFeeCents: null,
          startDate: values.startDate ?? todayIso(),
          expectedEndDate: null,
          notes: null,
          ...linkAssetDefaults,
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
  ]);

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
    fd.set("annualRatePct", String(v.annualRatePct));
    fd.set("termMonths", String(termMonthsForServer));
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
        assetIdToLink = r.assetId;
      } else if (v.linkAssetChoice === "existing") {
        assetIdToLink = v.linkedAssetId ?? null;
      }

      const debtRes = await createDebtAction("financing", fd);
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
          debtId: debtRes.debtId,
          allocationOriginalCents: allocationCents.toString(),
        });
        if (!linkRes.ok) {
          // Dívida foi criada; só falhou o vínculo. Avisamos e seguimos para a dívida.
          setServerError(`Dívida criada, mas falha ao vincular bem: ${linkRes.message}`);
          await invalidateDebtCaches(queryClient);
          router.push(`/app/dividas/${debtRes.debtId}` as Route);
          return;
        }
      }

      await invalidateDebtCaches(queryClient);
      router.push(`/app/dividas/${debtRes.debtId}` as Route);
    });
  }

  const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

  if (step === 2) {
    return (
      <WizardShell
        currentStep={2}
        totalSteps={6}
        title="Valor e taxa"
        description="Use os dados do contrato."
        onBack={() => router.push("/app/dividas/nova" as Route)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToStep3();
          },
          icon: arrowRight,
        }}
      >
        <ScenarioPicker
          label="Você já pagou alguma parcela desse financiamento?"
          active={scenario}
          onSelect={selectScenario}
        />

        <WizardField label="Rótulo da dívida" htmlFor={labelId} error={errors.label?.message}>
          <input
            id={labelId}
            {...form.register("label")}
            placeholder="Ex: Apto Vila Mariana"
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
              />
            </WizardField>

            <WizardField
              label="Taxa anual (a.a.)"
              htmlFor={rateId}
              error={errors.annualRatePct?.message}
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
              />
            </WizardField>

            <WizardField
              label="Saldo devedor atual"
              htmlFor={balanceId}
              error={
                (errors as { currentBalanceCents?: { message?: string } }).currentBalanceCents
                  ?.message
              }
              helper="No app do banco ou extrato."
            >
              <WizardMoneyField
                control={form.control}
                name={"currentBalanceCents" as never}
                id={balanceId}
                placeholder="R$ 0,00"
              />
            </WizardField>

            <WizardField
              label="Taxa anual (a.a.)"
              htmlFor={rateId}
              error={errors.annualRatePct?.message}
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
                error={
                  (errors as { remainingTerms?: { message?: string } }).remainingTerms?.message
                }
              >
                <input
                  id={remainingId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={600}
                  {...form.register("remainingTerms" as never, { valueAsNumber: true })}
                  className={wizardInputClass}
                />
              </WizardField>
            </div>
          </>
        )}
      </WizardShell>
    );
  }

  if (step === 3) {
    return (
      <WizardShell
        currentStep={3}
        totalSteps={6}
        title="Detalhes"
        description="Sistema de amortização e taxas extras."
        onBack={() => setStep(2)}
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
              label="Sistema de amortização"
              helpLink={<HowItWorksSheet topic="price-vs-sac" variant="brand" />}
            >
              <div className="grid grid-cols-2 gap-2">
                <WizardRadioCard
                  title="Price"
                  description="Parcela fixa"
                  active={field.value === "PRICE"}
                  onSelect={() => field.onChange("PRICE")}
                />
                <WizardRadioCard
                  title="SAC"
                  description="Parcela cai"
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
          />
        </WizardField>
      </WizardShell>
    );
  }

  if (step === 4) {
    const canAdvance = canAdvanceLinkAssetStep(values);
    return (
      <WizardShell
        currentStep={4}
        totalSteps={6}
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
  const installmentText: ReactNode =
    preview === "pending" || preview === null
      ? <Spinner size={20} decorative />
      : preview.ok
        ? preview.firstInstallmentFormatted
        : "Não foi possível calcular";

  const systemLabel = values.amortizationMethod === "PRICE" ? "Price" : "SAC";

  const computedSub =
    preview && preview !== "pending" && preview.ok
      ? preview.isFixed
        ? `por ${previewTerm} meses · ${systemLabel}`
        : `1ª parcela · ${previewTerm} meses · ${systemLabel}`
      : `por ${previewTerm} meses · ${systemLabel}`;

  const totalPaidValue =
    preview && preview !== "pending" && preview.ok ? preview.totalPaidFormatted : "...";

  const linkSummary = buildLinkSummary(values);
  const summaryItems = buildFinancingSummary({ values, totalPaidValue, linkSummary });

  return (
    <WizardShell
      currentStep={5}
      totalSteps={6}
      title="Confirme os dados"
      description="Olha como vai ficar antes de salvar."
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
