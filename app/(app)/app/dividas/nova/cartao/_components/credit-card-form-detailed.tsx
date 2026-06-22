"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";

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
import { BankCombobox } from "../../_components/bank-combobox";
import { ComputedCard } from "../../_components/computed-card";
import {
  canAdvanceLinkAssetStep,
  LinkAssetStepContent,
  validateLinkAssetStep,
} from "../../_components/link-asset-step";
import { RateEstimateHint } from "../../_components/rate-estimate-hint";
import { SummaryList } from "../../_components/summary-list";
import { WizardField, wizardInputClass } from "../../_components/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardPercentField } from "../../_components/wizard-percent-field";
import { WizardShell } from "../../_components/wizard-shell";
import { DEBT_RATE_ESTIMATES } from "../../_lib/debt-rate-estimates";
import {
  buildLinkSummary,
  debtCreatedHref,
  linkAssetDefaultsFor,
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
  label: z.string().min(1, "Informe um nome.").max(120),
  currency: z.enum(CURRENCIES),
  creditLimitCents: z.bigint().nullable(),
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
}).superRefine((d, ctx) => {
  if (d.creditLimitCents === null || d.creditLimitCents <= 0n) return;
  const used = d.currentStatementCents + (d.revolvingBalanceCents ?? 0n);
  if (used > d.creditLimitCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["currentStatementCents"],
      message: "A fatura mais o saldo que rolou não pode passar do limite do cartão.",
    });
  }
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
  defaultCurrency?: Currency;
  initialLinkAssetId?: string | null;
  // Vem do modo simples: pré-preenche o que a pessoa já digitou.
  seed?: { label: string; currentStatementCents: bigint; dueDay: number } | null;
}

export function CreditCardFormDetailed({
  existing = false,
  defaultCurrency = "BRL",
  initialLinkAssetId = null,
  seed = null,
}: CreditCardFormProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(2);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // Só quem está pagando juros (rotativo) vê o passo de taxa/saldo rotativo.
  // Quem paga a fatura toda pula direto, e o cartão vira 4 passos. No fluxo de
  // cartão antigo o rotativo costuma existir, então já começa marcado.
  const [revolving, setRevolving] = useState(existing);

  const [bank, setBank] = useState("");

  const labelId = useId();
  const bankId = useId();
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
      label: seed?.label ?? "Cartão de crédito",
      currency: defaultCurrency,
      creditLimitCents: null,
      currentStatementCents: (seed?.currentStatementCents ?? 0n) as unknown as bigint,
      statementDay: 1,
      dueDay: seed?.dueDay ?? 10,
      revolvingBalanceCents: null,
      revolvingMonthlyRatePct: null,
      startDate: todayIso(),
      expectedEndDate: null,
      notes: null,
      installmentPurchases: [],
      ...linkAssetDefaultsFor(initialLinkAssetId),
    },
  });

  const purchasesArray = useFieldArray({
    control: form.control,
    name: "installmentPurchases",
  });

  const values = form.watch();
  const errors = form.formState.errors;
  const currency: Currency = values.currency ?? defaultCurrency;

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
    if (!valid) return;
    if (revolving) {
      setStep(3);
    } else {
      // Paga a fatura toda: sem rotativo. Limpa e pula o passo de taxa.
      form.setValue("revolvingMonthlyRatePct", null);
      form.setValue("revolvingBalanceCents", null);
      setStep(4);
    }
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
    fd.set("currency", v.currency);
    fd.set("creditLimitCents", v.creditLimitCents ? v.creditLimitCents.toString() : "");
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
        assetIdToLink = r.data.assetId;
      } else if (v.linkAssetChoice === "existing") {
        assetIdToLink = v.linkedAssetId ?? null;
      }

      fd.set("kind", "credit_card");
      const debtRes = await createDebtAction(fd);
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
      }

      await invalidateDebtCaches(queryClient);
      router.push(debtCreatedHref(initialLinkAssetId, debtRes.data.debtId) as Route);
    });
  }

  const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

  // Numeração visível: o passo de rotativo (3) só conta quando existe. Sem ele,
  // os passos 4..6 sobem uma posição e o total cai pra 4.
  const totalSteps = revolving ? 5 : 4;
  const visibleStep = (s: Step): 1 | 2 | 3 | 4 | 5 => {
    if (s === 2) return 1;
    if (s === 3) return 2;
    return (revolving ? s - 1 : s - 2) as 1 | 2 | 3 | 4 | 5;
  };

  if (step === 2) {
    return (
      <WizardShell
        currentStep={visibleStep(2)}
        totalSteps={totalSteps}
        title={existing ? "Cartão com saldo antigo" : "Limites e fatura"}
        description={
          existing
            ? "Dados do cartão e de quanto ainda falta pagar."
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
        <WizardField label="Banco (opcional)" htmlFor={bankId}>
          <BankCombobox
            id={bankId}
            value={bank}
            onChange={(b) => {
              setBank(b);
              form.setValue("label", b.trim() ? `Cartão ${b.trim()}` : "Cartão de crédito", {
                shouldValidate: true,
              });
            }}
            placeholder="Ex: Nubank, Itaú, Caixa..."
          />
        </WizardField>

        <WizardField label="Nome do cartão" htmlFor={labelId} error={errors.label?.message}>
          <input
            id={labelId}
            {...form.register("label")}
            placeholder="Ex: Cartão Nubank"
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField
          label="Limite total"
          helper="Opcional. Mostra quanto do cartão você já usou."
          htmlFor={limitId}
          error={errors.creditLimitCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="creditLimitCents"
            id={limitId}
            placeholder="R$ 0,00"
            currency={currency}
            onCurrencyChange={(c) => form.setValue("currency", c)}
          />
        </WizardField>

        <WizardField
          label={existing ? "Quanto falta pagar" : "Quanto tem de fatura agora"}
          htmlFor={statementId}
          error={errors.currentStatementCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="currentStatementCents"
            id={statementId}
            placeholder="R$ 0,00"
            currency={currency}
          />
        </WizardField>

        <div className="grid grid-cols-2 gap-2">
          <WizardField
            label="Dia de fechamento"
            helper="Dia em que a fatura fecha e para de somar compras novas."
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

          <WizardField
            label="Dia de vencimento"
            helper="Dia de pagar a fatura. Vem escrito na própria fatura."
            htmlFor={dueDayId}
            error={errors.dueDay?.message}
          >
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

        <WizardField label="Você costuma pagar a fatura inteira ou só uma parte?">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={!revolving}
              onClick={() => setRevolving(false)}
              className={`focus-ring rounded-xl border-[1.5px] px-3 py-2.5 text-[0.8125rem] font-semibold transition-all ${
                !revolving
                  ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.10] text-[color:var(--color-brand-800)]"
                  : "border-[color:var(--border-soft)] text-[color:var(--text-secondary)]"
              }`}
            >
              Pago tudo
            </button>
            <button
              type="button"
              aria-pressed={revolving}
              onClick={() => setRevolving(true)}
              className={`focus-ring rounded-xl border-[1.5px] px-3 py-2.5 text-[0.8125rem] font-semibold transition-all ${
                revolving
                  ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/[0.10] text-[color:var(--color-brand-800)]"
                  : "border-[color:var(--border-soft)] text-[color:var(--text-secondary)]"
              }`}
            >
              Pago só uma parte
            </button>
          </div>
        </WizardField>
      </WizardShell>
    );
  }

  if (step === 3) {
    return (
      <WizardShell
        currentStep={visibleStep(3)}
        totalSteps={totalSteps}
        title="Taxas"
        description="Juros do cartão e data de início."
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
          label="Juros do cartão por mês (opcional)"
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
          <RateEstimateHint
            control={form.control}
            name="revolvingMonthlyRatePct"
            estimate={DEBT_RATE_ESTIMATES.creditCardRevolving}
          />
        </WizardField>

        <WizardField
          label="Tem saldo de antes que ainda não foi pago? (opcional)"
          helper="Valor que sobrou de faturas passadas e foi rolando."
          htmlFor={revolvingBalanceId}
          error={errors.revolvingBalanceCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="revolvingBalanceCents"
            id={revolvingBalanceId}
            placeholder="R$ 0,00"
            currency={currency}
          />
        </WizardField>

        <WizardField
          label="A partir de quando contar"
          helper="Quando esse cartão entra no seu planejamento. Pode deixar hoje."
          htmlFor={startDateId}
          error={errors.startDate?.message}
        >
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
        currentStep={visibleStep(4)}
        totalSteps={totalSteps}
        title="Compras parceladas"
        description="Compras que você ainda está pagando parcelado nesse cartão. Se não tiver, é só pular."
        onBack={() => setStep(revolving ? 3 : 2)}
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
        currentStep={visibleStep(5)}
        totalSteps={totalSteps}
        title="Parcelou algum bem nesse cartão?"
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
  const rateIsEstimated =
    values.revolvingMonthlyRatePct === DEBT_RATE_ESTIMATES.creditCardRevolving.valuePct;
  const rateLabel =
    values.revolvingMonthlyRatePct !== null && values.revolvingMonthlyRatePct !== undefined
      ? `${values.revolvingMonthlyRatePct}% por mês${rateIsEstimated ? " (estimativa)" : ""}`
      : "Não informada";

  const statementCents =
    typeof values.currentStatementCents === "bigint" ? values.currentStatementCents : 0n;
  const heroCents = statementCents > 0n ? statementCents : (monthlyInterestCents ?? 0n);
  const heroValue = formatCentsBRL(heroCents);
  const heroSub =
    revolving && monthlyInterestCents
      ? rateIsEstimated
        ? `Inclui ~${formatCentsBRL(monthlyInterestCents)} de juros se rolar (estimativa de mercado, confira na fatura)`
        : `Inclui juros de ${formatCentsBRL(monthlyInterestCents)} se rolar o saldo`
      : `Fatura que vence todo dia ${values.dueDay}`;

  const linkSummary = buildLinkSummary(values);

  return (
    <WizardShell
      currentStep={visibleStep(6)}
      totalSteps={totalSteps}
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
      <ComputedCard label="Vai sair do seu mês" value={heroValue} sub={heroSub} />

      <SummaryList
        items={[
          { label: "Nome", value: values.label || "Sem nome" },
          { label: "Tipo", value: "Cartão de crédito" },
          {
            label: "Limite",
            value: values.creditLimitCents
              ? formatCentsBRL(values.creditLimitCents)
              : "Não informado",
          },
          { label: "Fatura atual", value: formatCentsBRL(values.currentStatementCents) },
          { label: "Fechamento", value: `Dia ${values.statementDay}` },
          { label: "Vencimento", value: `Dia ${values.dueDay}` },
          ...(revolving ? [{ label: "Juros do cartão", value: rateLabel }] : []),
          {
            label: "Compras parceladas",
            value:
              purchasesArray.fields.length === 0
                ? "Não registrado"
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
