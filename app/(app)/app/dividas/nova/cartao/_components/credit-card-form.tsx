"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { HowItWorksSheet } from "../../../../_components/how-it-works-sheet";
import { createDebtAction } from "../../../_actions/create-debt.action";
import {
  InstallmentPurchasesEditor,
  sumMonthlyCents,
} from "../../../_components/installment-purchases-editor";
import { todayIso } from "../../../_lib/dates";
import { formatCentsBRL } from "../../../_lib/format";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { createAssetForDebtAction } from "../../_actions/create-asset-for-debt.action";
import { linkDebtToAssetAction } from "../../_actions/link-debt-to-asset.action";
import { ComputedCard } from "../../_components/computed-card";
import {
  canAdvanceLinkAssetStep,
  LinkAssetStepContent,
  validateLinkAssetStep,
} from "../../_components/link-asset-step";
import { SummaryList } from "../../_components/summary-list";
import { WizardField, wizardInputClass } from "../../_components/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardPercentField } from "../../_components/wizard-percent-field";
import { WizardShell } from "../../_components/wizard-shell";
import {
  buildLinkSummary,
  linkAssetDefaults,
  linkAssetSlice,
} from "../../_lib/link-asset";

const installmentPurchaseSchema = z
  .object({
    description: z.string().min(1, "Descreva a compra.").max(120),
    totalCents: z.bigint().positive("Total deve ser positivo."),
    installmentsTotal: z.number().int().min(1).max(120),
    installmentsRemaining: z.number().int().min(0).max(120),
  })
  .refine((d) => d.installmentsRemaining <= d.installmentsTotal, {
    message: "Restantes não pode ser maior que o total.",
    path: ["installmentsRemaining"],
  });

const formSchema = z.object({
  label: z.string().min(1, "Informe um rotulo.").max(120),
  creditLimitCents: z.bigint().positive("Limite deve ser positivo."),
  currentStatementCents: z.bigint().min(0n, "Não pode ser negativo."),
  statementDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  revolvingBalanceCents: z.bigint().nullable(),
  revolvingMonthlyRatePct: z.number().nullable(),
  startDate: z.string().min(1, "Informe a data de início."),
  expectedEndDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
  installmentPurchases: z.array(installmentPurchaseSchema),
  ...linkAssetSlice,
});

type FormValues = z.infer<typeof formSchema>;


type Step = 2 | 3 | 4 | 5 | 6;

const STEP2_FIELDS = [
  "label",
  "creditLimitCents",
  "currentStatementCents",
  "statementDay",
  "dueDay",
] as const;

const STEP3_FIELDS = ["revolvingMonthlyRatePct", "startDate"] as const;

const STEP4_FIELDS = ["installmentPurchases"] as const;

interface CreditCardFormProps {
  existing?: boolean;
}

export function CreditCardForm({ existing = false }: CreditCardFormProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(2);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const labelId = useId();
  const limitId = useId();
  const statementId = useId();
  const statementDayId = useId();
  const dueDayId = useId();
  const rateId = useId();
  const revolvingBalanceId = useId();
  const startDateId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      creditLimitCents: 0n as unknown as bigint,
      currentStatementCents: 0n as unknown as bigint,
      statementDay: 1,
      dueDay: 10,
      revolvingBalanceCents: null,
      revolvingMonthlyRatePct: null,
      startDate: todayIso(),
      expectedEndDate: null,
      notes: null,
      installmentPurchases: [],
      ...linkAssetDefaults,
    },
  });

  const purchasesArray = useFieldArray({
    control: form.control,
    name: "installmentPurchases",
  });

  const values = form.watch();
  const errors = form.formState.errors;

  const monthlyInstallmentsTotal = useMemo(
    () => sumMonthlyCents(values.installmentPurchases),
    [values.installmentPurchases],
  );

  // juros_mensais = fatura_atual × taxa_mensal / 100
  const monthlyInterestCents = useMemo(() => {
    const statement = values.currentStatementCents;
    const rate = values.revolvingMonthlyRatePct;
    if (typeof statement !== "bigint" || statement <= 0n) return null;
    if (rate === null || rate === undefined || !Number.isFinite(rate) || rate <= 0) return null;
    const statementReais = Number(statement) / 100;
    const interest = (statementReais * rate) / 100;
    if (!Number.isFinite(interest)) return null;
    return BigInt(Math.round(interest * 100));
  }, [values.currentStatementCents, values.revolvingMonthlyRatePct]);

  async function goToStep3() {
    const valid = await form.trigger(STEP2_FIELDS);
    if (valid) setStep(3);
  }

  async function goToStep4() {
    const valid = await form.trigger(STEP3_FIELDS);
    if (valid) setStep(4);
  }

  async function goToStep5() {
    const valid = await form.trigger(STEP4_FIELDS);
    if (valid) setStep(5);
  }

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
    fd.set("creditLimitCents", v.creditLimitCents.toString());
    fd.set("currentStatementCents", v.currentStatementCents.toString());
    fd.set("statementDay", String(v.statementDay));
    fd.set("dueDay", String(v.dueDay));
    fd.set(
      "revolvingBalanceCents",
      v.revolvingBalanceCents ? v.revolvingBalanceCents.toString() : "",
    );
    fd.set(
      "revolvingMonthlyRatePct",
      v.revolvingMonthlyRatePct !== null ? String(v.revolvingMonthlyRatePct) : "",
    );
    fd.set("startDate", v.startDate);
    fd.set("expectedEndDate", v.expectedEndDate ?? "");
    fd.set("notes", v.notes ?? "");
    fd.set(
      "installmentPurchasesJson",
      JSON.stringify(
        (v.installmentPurchases ?? []).map((p) => ({
          description: p.description,
          totalCents: p.totalCents.toString(),
          installmentsTotal: p.installmentsTotal,
          installmentsRemaining: p.installmentsRemaining,
        })),
      ),
    );

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
        assetIdToLink = r.assetId;
      } else if (v.linkAssetChoice === "existing") {
        assetIdToLink = v.linkedAssetId ?? null;
      }

      const debtRes = await createDebtAction("credit_card", fd);
      if (!debtRes.ok) {
        setServerError(debtRes.message);
        return;
      }

      if (assetIdToLink) {
        // Para cartão, principal alocado = fatura atual (referência mais próxima
        // de "valor da compra" desse cartão).
        const allocationDefault = v.currentStatementCents;
        const allocationCents =
          v.linkAssetChoice === "existing"
            ? (v.linkedAssetAllocationCents ?? allocationDefault)
            : allocationDefault;
        if (allocationCents > 0n) {
          const linkRes = await linkDebtToAssetAction({
            assetId: assetIdToLink,
            debtId: debtRes.debtId,
            allocationOriginalCents: allocationCents.toString(),
          });
          if (!linkRes.ok) {
            setServerError(`Dívida criada, mas falha ao vincular bem: ${linkRes.message}`);
            await invalidateDebtCaches(queryClient);
            router.push(`/app/dividas/${debtRes.debtId}` as Route);
            return;
          }
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
        title={existing ? "Cartão com saldo antigo" : "Limites e fatura"}
        description={
          existing
            ? "Dados do cartão e do saldo devedor atual."
            : "Dados do cartão e da fatura atual."
        }
        onBack={() =>
          router.push((existing ? "/app/dividas/nova/antiga" : "/app/dividas/nova") as Route)
        }
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToStep3();
          },
          icon: arrowRight,
        }}
      >
        <WizardField label="Rótulo do cartão" htmlFor={labelId} error={errors.label?.message}>
          <input
            id={labelId}
            {...form.register("label")}
            placeholder="Ex: Nubank Roxinho"
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField
          label="Limite total"
          htmlFor={limitId}
          error={errors.creditLimitCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="creditLimitCents"
            id={limitId}
            placeholder="R$ 0,00"
          />
        </WizardField>

        <WizardField
          label={existing ? "Saldo devedor atual" : "Fatura atual em aberto"}
          htmlFor={statementId}
          error={errors.currentStatementCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="currentStatementCents"
            id={statementId}
            placeholder="R$ 0,00"
          />
        </WizardField>

        <div className="grid grid-cols-2 gap-2">
          <WizardField
            label="Dia de fechamento"
            htmlFor={statementDayId}
            error={errors.statementDay?.message}
          >
            <input
              id={statementDayId}
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              {...form.register("statementDay", { valueAsNumber: true })}
              className={wizardInputClass}
            />
          </WizardField>

          <WizardField label="Dia de vencimento" htmlFor={dueDayId} error={errors.dueDay?.message}>
            <input
              id={dueDayId}
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              {...form.register("dueDay", { valueAsNumber: true })}
              className={wizardInputClass}
            />
          </WizardField>
        </div>
      </WizardShell>
    );
  }

  if (step === 3) {
    return (
      <WizardShell
        currentStep={3}
        totalSteps={6}
        title="Taxas"
        description="Taxa do rotativo e data de início."
        onBack={() => setStep(2)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToStep4();
          },
          icon: arrowRight,
        }}
      >
        <WizardField
          label="Taxa de juros do rotativo (a.m.)"
          htmlFor={rateId}
          error={errors.revolvingMonthlyRatePct?.message}
          helpLink={<HowItWorksSheet topic="rotativo" variant="brand" />}
        >
          <WizardPercentField
            control={form.control}
            name="revolvingMonthlyRatePct"
            id={rateId}
            step="0.01"
            min={0}
            max={1000}
          />
        </WizardField>

        <WizardField
          label="Saldo rotativo de faturas anteriores (opcional)"
          htmlFor={revolvingBalanceId}
          error={errors.revolvingBalanceCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="revolvingBalanceCents"
            id={revolvingBalanceId}
            placeholder="R$ 0,00"
          />
        </WizardField>

        <WizardField label="Data de início" htmlFor={startDateId} error={errors.startDate?.message}>
          <input
            id={startDateId}
            type="date"
            {...form.register("startDate")}
            className={wizardInputClass}
          />
        </WizardField>
      </WizardShell>
    );
  }

  if (step === 4) {
    return (
      <WizardShell
        currentStep={4}
        totalSteps={6}
        title="Compras parceladas"
        description="Compras ainda sendo pagas no cartão. Opcional."
        onBack={() => setStep(3)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToStep5();
          },
          icon: arrowRight,
        }}
      >
        <InstallmentPurchasesEditor
          arrayName="installmentPurchases"
          control={form.control}
          register={form.register}
          fields={purchasesArray.fields}
          append={purchasesArray.append}
          remove={purchasesArray.remove}
          values={values.installmentPurchases}
          errors={errors.installmentPurchases}
          totalMonthlyCents={monthlyInstallmentsTotal}
        />
      </WizardShell>
    );
  }

  if (step === 5) {
    const canAdvance = canAdvanceLinkAssetStep(values);
    return (
      <WizardShell
        currentStep={5}
        totalSteps={6}
        title="Esse compromisso é por causa de um bem?"
        description="Carro, imóvel ou outro patrimônio parcelado no cartão."
        onBack={() => setStep(4)}
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
        <LinkAssetStepContent
          form={form}
          debtPrincipalCents={values.currentStatementCents}
          enabled={step === 5}
        />
      </WizardShell>
    );
  }

  // step 6
  const interestText = monthlyInterestCents
    ? formatCentsBRL(monthlyInterestCents)
    : "Informe taxa para calcular";

  const rateLabel =
    values.revolvingMonthlyRatePct !== null && values.revolvingMonthlyRatePct !== undefined
      ? `${values.revolvingMonthlyRatePct}% a.m.`
      : "Sem taxa";

  const linkSummary = buildLinkSummary(values);

  return (
    <WizardShell
      currentStep={6}
      totalSteps={6}
      title="Confirme os dados"
      description="Olha como vai ficar antes de salvar."
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
        label="Juros mensais se ficar no rotativo"
        value={interestText}
        sub="Considerando a taxa atual"
      />

      <SummaryList
        items={[
          { label: "Rótulo", value: values.label || "Sem rótulo" },
          { label: "Tipo", value: "Cartão de crédito" },
          { label: "Limite", value: formatCentsBRL(values.creditLimitCents) },
          { label: "Fatura atual", value: formatCentsBRL(values.currentStatementCents) },
          { label: "Fechamento", value: `Dia ${values.statementDay}` },
          { label: "Vencimento", value: `Dia ${values.dueDay}` },
          { label: "Taxa rotativo", value: rateLabel },
          {
            label: "Compras parceladas",
            value:
              purchasesArray.fields.length === 0
                ? "Nenhuma"
                : `${purchasesArray.fields.length} compra(s) · ${formatCentsBRL(monthlyInstallmentsTotal)}/mês`,
          },
          { label: "Bem vinculado", value: linkSummary },
        ]}
      />

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
