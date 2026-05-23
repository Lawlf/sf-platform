"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { HowItWorksSheet } from "../../../../_components/how-it-works-sheet";
import { createDebtAction } from "../../../_actions/create-debt.action";
import { todayIso } from "../../../_lib/dates";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { ComputedCard } from "../../_components/computed-card";
import { SummaryList } from "../../_components/summary-list";
import { WizardField, wizardInputClass } from "../../_components/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardPercentField } from "../../_components/wizard-percent-field";
import { WizardShell } from "../../_components/wizard-shell";

const formSchema = z.object({
  label: z.string().min(1, "Informe um rotulo.").max(120),
  currentBalanceCents: z.bigint().positive("Saldo deve ser positivo."),
  bankName: z.string().min(1, "Informe o banco.").max(120),
  monthlyRatePct: z.number().min(0).max(1000),
  startDate: z.string().min(1, "Informe a data de inicio."),
  expectedEndDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;


type Step = 2 | 3 | 4;

const STEP2_FIELDS = ["label", "bankName", "currentBalanceCents"] as const;

const STEP3_FIELDS = ["monthlyRatePct", "startDate"] as const;

function formatBRL(cents: bigint | null | undefined): string {
  if (cents === null || cents === undefined) return "R$ 0,00";
  const reais = Number(cents) / 100;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function OverdraftForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(2);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const labelId = useId();
  const bankId = useId();
  const balanceId = useId();
  const rateId = useId();
  const startDateId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      currentBalanceCents: 0n as unknown as bigint,
      bankName: "",
      monthlyRatePct: 0,
      startDate: todayIso(),
      expectedEndDate: null,
      notes: null,
    },
  });

  const values = form.watch();
  const errors = form.formState.errors;

  // juros_mensais = saldo × taxa_mensal / 100
  const monthlyInterestCents = useMemo(() => {
    const balance = values.currentBalanceCents;
    const rate = values.monthlyRatePct;
    if (typeof balance !== "bigint" || balance <= 0n) return null;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null;
    const balanceReais = Number(balance) / 100;
    const interest = (balanceReais * rate) / 100;
    if (!Number.isFinite(interest)) return null;
    return BigInt(Math.round(interest * 100));
  }, [values.currentBalanceCents, values.monthlyRatePct]);

  async function goToStep3() {
    const valid = await form.trigger(STEP2_FIELDS);
    if (valid) setStep(3);
  }

  async function goToStep4() {
    const valid = await form.trigger(STEP3_FIELDS);
    if (valid) setStep(4);
  }

  async function handleSubmit() {
    setServerError(null);
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    const fd = new FormData();
    fd.set("label", v.label);
    fd.set("currentBalanceCents", v.currentBalanceCents.toString());
    fd.set("bankName", v.bankName);
    fd.set("monthlyRatePct", String(v.monthlyRatePct));
    fd.set("startDate", v.startDate);
    fd.set("expectedEndDate", v.expectedEndDate ?? "");
    fd.set("notes", v.notes ?? "");
    startTransition(async () => {
      const r = await createDebtAction("overdraft", fd);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      await invalidateDebtCaches(queryClient);
      router.push(`/app/dividas/${r.debtId}` as Route);
    });
  }

  const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

  if (step === 2) {
    return (
      <WizardShell
        currentStep={2}
        totalSteps={4}
        title="Saldo devedor"
        description="Quanto está usando do cheque especial agora."
        onBack={() => router.push("/app/dividas/nova" as Route)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToStep3();
          },
          icon: arrowRight,
        }}
      >
        <WizardField label="Rótulo" htmlFor={labelId} error={errors.label?.message}>
          <input
            id={labelId}
            {...form.register("label")}
            placeholder="Ex: Itaú"
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField label="Banco" htmlFor={bankId} error={errors.bankName?.message}>
          <input
            id={bankId}
            {...form.register("bankName")}
            placeholder="Ex: Itaú, Bradesco, Caixa..."
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField
          label="Saldo devedor atual"
          htmlFor={balanceId}
          error={errors.currentBalanceCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="currentBalanceCents"
            id={balanceId}
            placeholder="R$ 0,00"
          />
        </WizardField>
      </WizardShell>
    );
  }

  if (step === 3) {
    return (
      <WizardShell
        currentStep={3}
        totalSteps={4}
        title="Taxa"
        description="Taxa do banco e data de início."
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
          label="Taxa de juros (a.m.)"
          htmlFor={rateId}
          error={errors.monthlyRatePct?.message}
          helpLink={<HowItWorksSheet topic="cheque-especial" variant="brand" />}
        >
          <WizardPercentField
            control={form.control}
            name="monthlyRatePct"
            id={rateId}
            step="0.01"
            min={0}
            max={1000}
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

  // step 4
  const interestText = monthlyInterestCents
    ? formatBRL(monthlyInterestCents)
    : "Informe taxa para calcular";

  return (
    <WizardShell
      currentStep={4}
      totalSteps={4}
      title="Confirme os dados"
      description="Olha como vai ficar antes de salvar."
      onBack={() => setStep(3)}
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
        label="Juros mensais nesse saldo"
        value={interestText}
        sub="Considerando a taxa atual"
      />

      <SummaryList
        items={[
          { label: "Rótulo", value: values.label || "Sem rótulo" },
          { label: "Tipo", value: "Cheque especial" },
          { label: "Banco", value: values.bankName || "Sem banco" },
          { label: "Saldo devedor", value: formatBRL(values.currentBalanceCents) },
          { label: "Taxa", value: `${values.monthlyRatePct}% a.m.` },
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
