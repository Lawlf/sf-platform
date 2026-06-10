"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Calculator } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import type { Currency } from "@/domain/value-objects/money.vo";

import { HowItWorksSheet } from "../../../../_components/how-it-works-sheet";
import { createDebtAction } from "../../../_actions/create-debt.action";
import { computeCetAnnualText, computePriceInstallmentCents } from "../../../_lib/amortization";
import { todayIso } from "../../../_lib/dates";
import { formatCentsBRL } from "../../../_lib/format";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { createAssetForDebtAction } from "../../_actions/create-asset-for-debt.action";
import { linkDebtToAssetAction } from "../../_actions/link-debt-to-asset.action";
import {
  listCashAssetsForLoan,
  type CashAssetForLoanPayload,
} from "../../_actions/list-cash-assets-for-loan.action";
import {
  registerLoanCashInflowAction,
  type RegisterLoanCashInflowActionInput,
} from "../../_actions/register-loan-cash-inflow.action";
import { BankCombobox } from "../../_components/bank-combobox";
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
import { WizardShell } from "../../_components/wizard-shell";
import { buildLinkSummary, linkAssetDefaults } from "../../_lib/link-asset";
import {
  NEW_STEP2_FIELDS,
  ONGOING_STEP2_FIELDS,
  STEP3_FIELDS,
  personalLoanFormSchema,
  type PersonalLoanFormValues,
} from "../_schema";

import {
  CashInflowStep,
  canAdvanceCashInflowStep,
  validateCashInflowStep,
} from "./cash-inflow-step";
import { buildLoanSummary } from "./loan-summary";

type FormValues = PersonalLoanFormValues;


type Step = 2 | 3 | 4 | 5 | 6;

const cashInflowDefaults = {
  cashTarget: null as ("existing" | "new" | "spent") | null,
  existingCashAssetId: null as string | null,
  newCashAssetName: null as string | null,
  newCashAssetCurrentBalanceCents: null as bigint | null,
};

interface PersonalLoanFormProps {
  initialScenario?: "new" | "ongoing";
  defaultCurrency?: Currency;
}

export function PersonalLoanForm({
  initialScenario = "new",
  defaultCurrency = "BRL",
}: PersonalLoanFormProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(2);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [bank, setBank] = useState("");

  const labelId = useId();
  const bankId = useId();
  const netReceivedId = useId();
  const principalId = useId();
  const balanceId = useId();
  const rateId = useId();
  const termId = useId();
  const remainingTermsId = useId();
  const installmentId = useId();
  const startDateId = useId();
  const cashInflowId = useId();
  const newCashNameId = useId();
  const newCashBalanceId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(personalLoanFormSchema),
    defaultValues:
      initialScenario === "ongoing"
        ? ({
            scenario: "ongoing",
            currency: defaultCurrency,
            label: "Empréstimo",
            originalPrincipalCents: 0n as unknown as bigint,
            currentBalanceCents: 0n as unknown as bigint,
            monthlyInstallmentCents: 0n as unknown as bigint,
            paidInstallments: 0,
            remainingTerms: 24,
            annualRatePct: 0,
            startDate: todayIso(),
            expectedEndDate: null,
            notes: null,
            ...linkAssetDefaults,
            ...cashInflowDefaults,
          } as FormValues)
        : ({
            scenario: "new",
            currency: defaultCurrency,
            label: "Empréstimo",
            netReceivedCents: 0n as unknown as bigint,
            principalCents: 0n as unknown as bigint,
            annualRatePct: 0,
            termMonths: 24,
            monthlyInstallmentCents: 0n as unknown as bigint,
            startDate: todayIso(),
            expectedEndDate: null,
            notes: null,
            ...linkAssetDefaults,
            ...cashInflowDefaults,
          } as FormValues),
  });

  const values = form.watch();
  const errors = form.formState.errors;
  const scenario = values.scenario;
  const currency: Currency = values.currency ?? defaultCurrency;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formAny = form as UseFormReturn<any>;

  // IOF / fees computed only in the "new" scenario when both money fields exist.
  const iofCents = useMemo<bigint | null>(() => {
    if (scenario !== "new") return null;
    const net = (values as Extract<FormValues, { scenario: "new" }>).netReceivedCents;
    const principal = (values as Extract<FormValues, { scenario: "new" }>).principalCents;
    if (typeof net !== "bigint" || typeof principal !== "bigint") return null;
    if (net <= 0n || principal <= 0n) return null;
    if (principal <= net) return null;
    return principal - net;
  }, [scenario, values]);

  const iofPercentText = useMemo<string | null>(() => {
    if (iofCents === null) return null;
    if (scenario !== "new") return null;
    const principal = (values as Extract<FormValues, { scenario: "new" }>).principalCents;
    if (typeof principal !== "bigint" || principal <= 0n) return null;
    const pct = (Number(iofCents) / Number(principal)) * 100;
    if (!Number.isFinite(pct)) return null;
    return pct.toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  }, [iofCents, scenario, values]);

  // Estimated installment for the "new" flow (Price formula on principal contratado).
  const estimatedInstallmentCents = useMemo<bigint | null>(() => {
    if (scenario !== "new") return null;
    const v = values as Extract<FormValues, { scenario: "new" }>;
    if (typeof v.principalCents !== "bigint") return null;
    return computePriceInstallmentCents(v.principalCents, v.annualRatePct, v.termMonths);
  }, [scenario, values]);

  const cetAnnualText = useMemo<string | null>(() => {
    if (scenario !== "new") return null;
    const v = values as Extract<FormValues, { scenario: "new" }>;
    if (!estimatedInstallmentCents) return null;
    if (typeof v.principalCents !== "bigint" || typeof v.netReceivedCents !== "bigint") return null;
    return computeCetAnnualText(
      v.netReceivedCents,
      v.principalCents,
      estimatedInstallmentCents,
      v.termMonths,
    );
  }, [scenario, values, estimatedInstallmentCents]);

  // Total paid: depends on scenario.
  const totalPaidCents = useMemo<bigint | null>(() => {
    if (scenario === "new") {
      if (!estimatedInstallmentCents) return null;
      const v = values as Extract<FormValues, { scenario: "new" }>;
      if (typeof v.termMonths !== "number" || !Number.isFinite(v.termMonths) || v.termMonths < 1)
        return null;
      return estimatedInstallmentCents * BigInt(Math.floor(v.termMonths));
    }
    const v = values as Extract<FormValues, { scenario: "ongoing" }>;
    if (typeof v.monthlyInstallmentCents !== "bigint" || v.monthlyInstallmentCents <= 0n)
      return null;
    if (
      typeof v.remainingTerms !== "number" ||
      !Number.isFinite(v.remainingTerms) ||
      v.remainingTerms < 1
    )
      return null;
    return v.monthlyInstallmentCents * BigInt(Math.floor(v.remainingTerms));
  }, [scenario, values, estimatedInstallmentCents]);

  // Cash inflow query: carregado ao entrar no step 4
  const { data: cashAssets, isLoading: loadingCashAssets } = useQuery<CashAssetForLoanPayload[]>({
    queryKey: ["loan-cash-assets"],
    queryFn: () => listCashAssetsForLoan(),
    enabled: step === 4,
    staleTime: 30_000,
  });

  // Cash inflow form values
  const cashTarget =
    (values as { cashTarget?: ("existing" | "new" | "spent") | null | undefined }).cashTarget ??
    null;
  const existingCashAssetId =
    (values as { existingCashAssetId?: string | null | undefined }).existingCashAssetId ?? null;

  function selectScenario(next: "new" | "ongoing") {
    if (next === scenario) return;
    // Reset shared/relevant fields when toggling scenarios to avoid leaking values.
    if (next === "new") {
      form.reset(
        {
          scenario: "new",
          currency: values.currency ?? defaultCurrency,
          label: values.label ?? "",
          netReceivedCents: 0n as unknown as bigint,
          principalCents: 0n as unknown as bigint,
          annualRatePct: 0,
          termMonths: 24,
          monthlyInstallmentCents: 0n as unknown as bigint,
          startDate: values.startDate ?? todayIso(),
          expectedEndDate: null,
          notes: null,
          ...linkAssetDefaults,
          ...cashInflowDefaults,
        } as FormValues,
        { keepErrors: false },
      );
    } else {
      form.reset(
        {
          scenario: "ongoing",
          currency: values.currency ?? defaultCurrency,
          label: values.label ?? "",
          originalPrincipalCents: 0n as unknown as bigint,
          currentBalanceCents: 0n as unknown as bigint,
          monthlyInstallmentCents: 0n as unknown as bigint,
          paidInstallments: 0,
          remainingTerms: 24,
          annualRatePct: 0,
          startDate: values.startDate ?? todayIso(),
          expectedEndDate: null,
          notes: null,
          ...linkAssetDefaults,
          // Para "ongoing" o dinheiro já caiu há tempos — não pergunta cash inflow.
          cashTarget: "spent" as const,
          existingCashAssetId: null as string | null,
          newCashAssetName: null as string | null,
          newCashAssetCurrentBalanceCents: null as bigint | null,
        } as FormValues,
        { keepErrors: false },
      );
    }
  }

  async function goToStep3() {
    const fields = (
      scenario === "new" ? NEW_STEP2_FIELDS : ONGOING_STEP2_FIELDS
    ) as readonly (keyof FormValues)[];
    const valid = await form.trigger(fields as Parameters<typeof form.trigger>[0]);
    if (!valid) return;
    if (scenario === "new") {
      const current = form.getValues("monthlyInstallmentCents") as bigint | undefined;
      if (
        (current === undefined || current === null || current === 0n) &&
        estimatedInstallmentCents
      ) {
        form.setValue("monthlyInstallmentCents", estimatedInstallmentCents, {
          shouldValidate: false,
        });
      }
    }
    setStep(3);
  }

  async function goToStep4() {
    const valid = await form.trigger(STEP3_FIELDS as Parameters<typeof form.trigger>[0]);
    if (!valid) return;
    // Ongoing: dinheiro já caiu meses atrás — pula etapa de cash inflow.
    if (scenario === "ongoing") {
      setStep(5);
      return;
    }
    setStep(4);
  }

  function goToStep5() {
    const newCashName = (values as { newCashAssetName?: string | null }).newCashAssetName ?? null;
    const err = validateCashInflowStep({
      cashTarget,
      existingCashAssetId,
      newCashAssetName: newCashName,
    });
    if (err) {
      setServerError(err);
      return;
    }
    setServerError(null);
    setStep(5);
  }

  // Was goToStep5, now navigates to step 6 (Confirmar)
  function goToStep6() {
    setStep(6);
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

    // Map both scenarios onto the server-action's existing FormData contract.
    let principalForServer: bigint;
    let termMonthsForServer: number;
    let monthlyInstallmentForServer: bigint;

    let currentBalanceForServer: bigint | null = null;
    let paidInstallmentsForServer: number | null = null;

    if (v.scenario === "new") {
      principalForServer = v.principalCents;
      termMonthsForServer = v.termMonths;
      monthlyInstallmentForServer =
        computePriceInstallmentCents(v.principalCents, v.annualRatePct, v.termMonths) ??
        v.monthlyInstallmentCents ??
        0n;
    } else {
      // "ongoing": principal = valor original do contrato (cronograma completo).
      // Saldo devedor atual e parcelas pagas vão em campos separados.
      principalForServer = v.originalPrincipalCents;
      termMonthsForServer = v.paidInstallments + v.remainingTerms;
      monthlyInstallmentForServer = v.monthlyInstallmentCents;
      currentBalanceForServer = v.currentBalanceCents;
      paidInstallmentsForServer = v.paidInstallments;
    }

    fd.set("principalCents", principalForServer.toString());
    fd.set("annualRatePct", v.annualRatePct ? String(v.annualRatePct) : "");
    fd.set("termMonths", String(termMonthsForServer));
    fd.set("monthlyInstallmentCents", monthlyInstallmentForServer.toString());
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

      fd.set("kind", "personal_loan");
      const debtRes = await createDebtAction(fd);
      if (!debtRes.ok) {
        setServerError(debtRes.message);
        return;
      }

      // Cash inflow (opcional; falha loga aviso e nao reverte a divida)
      const vAny = v as {
        cashTarget?: ("existing" | "new" | "spent") | null;
        existingCashAssetId?: string | null;
        newCashAssetName?: string | null;
        newCashAssetCurrentBalanceCents?: bigint | null;
      };
      const cashTargetVal = vAny.cashTarget ?? "spent";
      if (cashTargetVal !== "spent" && cashTargetVal != null) {
        const cashPrincipalCents =
          v.scenario === "new"
            ? v.principalCents
            : (v as Extract<FormValues, { scenario: "ongoing" }>).originalPrincipalCents;

        const cashActionInput: RegisterLoanCashInflowActionInput = {
          debtId: debtRes.data.debtId,
          cashTarget: cashTargetVal,
          principalCents: cashPrincipalCents.toString(),
          ...(cashTargetVal === "existing" && vAny.existingCashAssetId
            ? { existingCashAssetId: vAny.existingCashAssetId }
            : {}),
          ...(cashTargetVal === "new" && vAny.newCashAssetName
            ? { newCashAssetName: vAny.newCashAssetName }
            : {}),
          ...(cashTargetVal === "new" && vAny.newCashAssetCurrentBalanceCents != null
            ? {
                newCashAssetCurrentBalanceCents: (
                  vAny.newCashAssetCurrentBalanceCents as bigint
                ).toString(),
              }
            : {}),
        };

        const cashRes = await registerLoanCashInflowAction(cashActionInput);
        if (!cashRes.ok) {
          // Orphan-tolerant: divida foi criada, cash inflow falhou. Avisa e continua.
          setServerError(
            `Dívida criada, mas não foi possível atualizar a conta: ${cashRes.message}`,
          );
          await invalidateDebtCaches(queryClient);
          router.push(`/app/dividas/${debtRes.data.debtId}` as Route);
          return;
        }
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
          setServerError(`Dívida criada, mas falha ao vincular bem: ${linkRes.message}`);
          await invalidateDebtCaches(queryClient);
          router.push(`/app/dividas/${debtRes.data.debtId}` as Route);
          return;
        }
      }

      await invalidateDebtCaches(queryClient);
      router.push(`/app/dividas/${debtRes.data.debtId}` as Route);
    });
  }

  const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

  if (step === 2) {
    return (
      <WizardShell
        currentStep={1}
        totalSteps={5}
        title="Valores"
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
          label="Você já pagou alguma parcela desse empréstimo?"
          active={scenario}
          onSelect={selectScenario}
          newDescription="Recebi o dinheiro agora"
        />

        <WizardField label="Banco (opcional)" htmlFor={bankId}>
          <BankCombobox
            id={bankId}
            value={bank}
            onChange={(b) => {
              setBank(b);
              formAny.setValue("label", b.trim() ? `Empréstimo ${b.trim()}` : "Empréstimo", {
                shouldValidate: true,
              });
            }}
            placeholder="Ex: Nubank, Itaú, Caixa..."
          />
        </WizardField>

        <WizardField label="Rótulo da dívida" htmlFor={labelId} error={errors.label?.message}>
          <input
            id={labelId}
            {...form.register("label")}
            placeholder="Ex: Empréstimo Nubank"
            className={wizardInputClass}
          />
        </WizardField>

        {scenario === "new" ? (
          <>
            <WizardField
              label="Valor recebido na conta"
              htmlFor={netReceivedId}
              error={
                (errors as { netReceivedCents?: { message?: string } }).netReceivedCents?.message
              }
            >
              <WizardMoneyField
                control={form.control}
                name={"netReceivedCents" as never}
                id={netReceivedId}
                placeholder="R$ 0,00"
                currency={currency}
                onCurrencyChange={(c) => formAny.setValue("currency", c)}
              />
            </WizardField>

            <WizardField
              label="Quanto você vai pagar no total (com taxas)"
              htmlFor={principalId}
              error={(errors as { principalCents?: { message?: string } }).principalCents?.message}
              helpLink={<HowItWorksSheet topic="iof" variant="brand" />}
            >
              <WizardMoneyField
                control={form.control}
                name={"principalCents" as never}
                id={principalId}
                placeholder="R$ 0,00"
                currency={currency}
              />
              {iofCents && iofPercentText ? (
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-brand-500)]/[0.10] px-2.5 py-1 text-[0.6875rem] font-semibold text-[color:var(--color-brand-800)]">
                  <Calculator size={11} strokeWidth={2.25} aria-hidden />
                  IOF + tarifas: {formatCentsBRL(iofCents)} ({iofPercentText}%)
                </div>
              ) : null}
            </WizardField>

            <WizardField
              label="Taxa por ano (opcional)"
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
              {cetAnnualText ? (
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-brand-500)]/[0.10] px-2.5 py-1 text-[0.6875rem] font-semibold text-[color:var(--color-brand-800)]">
                  <Calculator size={11} strokeWidth={2.25} aria-hidden />
                  Custo real dos juros por ano: {cetAnnualText}
                </div>
              ) : null}
            </WizardField>

            <WizardField
              label="Prazo (meses)"
              htmlFor={termId}
              error={
                (errors as { termMonths?: { message?: string } }).termMonths?.message ?? undefined
              }
            >
              <input
                id={termId}
                type="number"
                inputMode="numeric"
                min={1}
                max={420}
                {...form.register("termMonths" as never, { valueAsNumber: true })}
                className={wizardInputClass}
              />
            </WizardField>
          </>
        ) : (
          <>
            <WizardField
              label="Quanto você pegou emprestado (com taxas)"
              htmlFor={principalId}
              error={
                (errors as { originalPrincipalCents?: { message?: string } }).originalPrincipalCents
                  ?.message
              }
              helper="Olha o contrato ou o app do banco. É o total financiado, não o que sobrou."
            >
              <WizardMoneyField
                control={form.control}
                name={"originalPrincipalCents" as never}
                id={principalId}
                placeholder="R$ 0,00"
                currency={currency}
                onCurrencyChange={(c) => formAny.setValue("currency", c)}
              />
            </WizardField>

            <WizardField
              label="Saldo devedor atual"
              htmlFor={balanceId}
              error={
                (errors as { currentBalanceCents?: { message?: string } }).currentBalanceCents
                  ?.message
              }
              helper="Quanto ainda falta pagar hoje. Está no extrato."
            >
              <WizardMoneyField
                control={form.control}
                name={"currentBalanceCents" as never}
                id={balanceId}
                placeholder="R$ 0,00"
                currency={currency}
              />
            </WizardField>

            <WizardField
              label="Parcela mensal"
              htmlFor={installmentId}
              error={errors.monthlyInstallmentCents?.message}
            >
              <WizardMoneyField
                control={form.control}
                name="monthlyInstallmentCents"
                id={installmentId}
                placeholder="R$ 0,00"
                currency={currency}
              />
            </WizardField>

            <div className="grid grid-cols-2 gap-3">
              <WizardField
                label="Parcelas já pagas"
                error={
                  (errors as { paidInstallments?: { message?: string } }).paidInstallments?.message
                }
              >
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={420}
                  placeholder="Ex: 6"
                  {...form.register("paidInstallments" as never, { valueAsNumber: true })}
                  className={wizardInputClass}
                />
              </WizardField>

              <WizardField
                label="Parcelas restantes"
                htmlFor={remainingTermsId}
                error={
                  (errors as { remainingTerms?: { message?: string } }).remainingTerms?.message ??
                  undefined
                }
              >
                <input
                  id={remainingTermsId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={420}
                  {...form.register("remainingTerms" as never, { valueAsNumber: true })}
                  className={wizardInputClass}
                />
              </WizardField>
            </div>

            <WizardField
              label="Taxa por ano (opcional)"
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
          </>
        )}
      </WizardShell>
    );
  }

  if (step === 3) {
    const installmentHelper =
      scenario === "new" && estimatedInstallmentCents
        ? `Estimado: ${formatCentsBRL(estimatedInstallmentCents)}`
        : undefined;

    return (
      <WizardShell
        currentStep={2}
        totalSteps={5}
        title="Detalhes"
        description="Parcela e data de início do contrato."
        onBack={() => setStep(2)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToStep4();
          },
          icon: arrowRight,
        }}
      >
        <div className="mb-[14px] rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2.5 text-[0.75rem] text-[color:var(--text-primary)] opacity-80">
          Empréstimo costuma ter parcela fixa do começo ao fim.
        </div>

        <WizardField label="Data de início" htmlFor={startDateId} error={errors.startDate?.message}>
          <input
            id={startDateId}
            type="date"
            {...form.register("startDate")}
            className={wizardInputClass}
          />
        </WizardField>

        {scenario === "new" ? (
          <WizardField
            label="Parcela mensal"
            htmlFor={installmentId}
            error={errors.monthlyInstallmentCents?.message}
            helper={installmentHelper}
          >
            <WizardMoneyField
              control={form.control}
              name="monthlyInstallmentCents"
              id={installmentId}
              placeholder="R$ 0,00"
              currency={currency}
            />
          </WizardField>
        ) : null}
      </WizardShell>
    );
  }

  // step 4: Cash inflow
  if (step === 4) {
    const newCashName = (values as { newCashAssetName?: string | null }).newCashAssetName ?? null;
    const canAdvanceCash = canAdvanceCashInflowStep({
      cashTarget,
      existingCashAssetId,
      newCashAssetName: newCashName,
    });

    return (
      <WizardShell
        currentStep={3}
        totalSteps={5}
        title="Esse dinheiro caiu numa conta?"
        description="Assim o saldo da Carteira fica certo desde o começo."
        onBack={() => setStep(3)}
        primary={
          canAdvanceCash
            ? {
                label: "Próximo",
                onClick: goToStep5,
                icon: arrowRight,
              }
            : undefined
        }
      >
        <CashInflowStep
          cashInflowFieldId={cashInflowId}
          newCashNameId={newCashNameId}
          newCashBalanceId={newCashBalanceId}
          loadingCashAssets={loadingCashAssets}
          cashAssets={cashAssets}
          cashTarget={cashTarget}
          existingCashAssetId={existingCashAssetId}
          serverError={serverError}
          newCashAssetName={newCashName}
          form={formAny}
          onTargetChange={(target, assetId) => {
            formAny.setValue("cashTarget", target, { shouldDirty: true });
            formAny.setValue("existingCashAssetId", assetId ?? null, { shouldDirty: true });
            setServerError(null);
          }}
        />
      </WizardShell>
    );
  }

  // step 5: Link asset (era step 4)
  if (step === 5) {
    const canAdvance = canAdvanceLinkAssetStep(values);
    // Principal usado para pre-preencher alocacao (caso tipico v1).
    const debtPrincipal =
      scenario === "new"
        ? ((values as Extract<FormValues, { scenario: "new" }>).principalCents ?? 0n)
        : ((values as Extract<FormValues, { scenario: "ongoing" }>).originalPrincipalCents ?? 0n);
    return (
      <WizardShell
        currentStep={4}
        totalSteps={5}
        title="Esse compromisso é por causa de um bem?"
        description="Carro, imóvel ou outro patrimônio. Você pode pular e vincular depois."
        onBack={() => setStep(scenario === "ongoing" ? 3 : 4)}
        primary={
          canAdvance
            ? {
                label: "Próximo",
                onClick: goToStep6,
                icon: arrowRight,
              }
            : undefined
        }
      >
        <LinkAssetStepContent form={form} debtPrincipalCents={debtPrincipal} enabled={step === 5} />
      </WizardShell>
    );
  }

  // step 6: Confirmar (era step 5)
  const installmentCentsForCard =
    scenario === "new" ? estimatedInstallmentCents : values.monthlyInstallmentCents;
  const installmentText =
    installmentCentsForCard && installmentCentsForCard > 0n
      ? formatCentsBRL(installmentCentsForCard)
      : "Não foi possível calcular";

  const termsForCard =
    scenario === "new"
      ? (values as Extract<FormValues, { scenario: "new" }>).termMonths
      : (values as Extract<FormValues, { scenario: "ongoing" }>).remainingTerms;

  const totalPaidValue = totalPaidCents ? formatCentsBRL(totalPaidCents) : "...";
  const linkSummary = buildLinkSummary(values);
  const summary = buildLoanSummary({
    values,
    iofCents,
    iofPercentText,
    cetAnnualText,
    cashAssets,
    totalPaidValue,
    linkSummary,
  });

  return (
    <WizardShell
      currentStep={5}
      totalSteps={5}
      title="Confirme os dados"
      description="Confere os números e salva."
      onBack={() => setStep(5)}
      primary={{
        label: "Salvar dívida",
        onClick: () => {
          void handleSubmit();
        },
        disabled: pending,
        loading: pending,
      }}
    >
      <ComputedCard
        label={scenario === "new" ? "Sua parcela mensal" : "Parcela mensal"}
        value={installmentText}
        sub={`por ${termsForCard} meses · parcela fixa`}
      />

      <SummaryList items={summary} />

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
