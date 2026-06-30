"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { type Currency } from "@/domain/value-objects/money.vo";

import { createDebtAction } from "../../../_actions/create-debt.action";
import { todayIso } from "@/shared/format/dates";
import { formatCentsBRL } from "../../../_lib/format";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { ComputedCard } from "../../_components/computed-card";
import { SummaryList } from "../../_components/summary-list";
import { WizardField, wizardInputClass } from "@/ui/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardShell } from "../../_components/wizard-shell";

// Modo "divida simples": o ICP so sabe "pago X por mes, faltam Y parcelas".
// Guardamos isso como um emprestimo onde principal = parcela x restantes e a
// taxa fica em branco (o backend resolve ~0%). Resultado: saldo = parcela x
// restantes e saida mensal = parcela. Sem amortizacao/jargao. Taxa e prazo
// certos sao adiaveis no caminho detalhado.
const formSchema = z.object({
  label: z.string().min(1, "Informe um nome.").max(120),
  monthlyInstallmentCents: z.bigint().positive("Informe quanto paga por mês."),
  remainingInstallments: z.number().int().min(1, "Quantas faltam?").max(600),
});

type FormValues = z.infer<typeof formSchema>;

function parcelas(n: number): string {
  return `${n} ${n === 1 ? "parcela" : "parcelas"}`;
}

type Step = 1 | 2;

export interface LoanSeed {
  label: string;
  monthlyInstallmentCents: bigint;
  remainingInstallments: number;
}

interface Props {
  defaultCurrency?: Currency;
  onWantDetailed: (seed: LoanSeed) => void;
}

export function SimpleInstallmentDebtForm({ defaultCurrency = "BRL", onWantDetailed }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const labelId = useId();
  const installmentId = useId();
  const remainingId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "Empréstimo",
      monthlyInstallmentCents: 0n as unknown as bigint,
      remainingInstallments: undefined as unknown as number,
    },
  });

  const values = form.watch();
  const errors = form.formState.errors;

  const installmentCents =
    typeof values.monthlyInstallmentCents === "bigint" ? values.monthlyInstallmentCents : 0n;
  const remaining = values.remainingInstallments || 0;
  const balanceCents = installmentCents * BigInt(remaining);

  async function goToConfirm() {
    const valid = await form.trigger(["label", "monthlyInstallmentCents", "remainingInstallments"]);
    if (valid) setStep(2);
  }

  async function handleSubmit() {
    setServerError(null);
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    const principal = v.monthlyInstallmentCents * BigInt(v.remainingInstallments);

    const fd = new FormData();
    fd.set("kind", "personal_loan");
    fd.set("currency", defaultCurrency);
    fd.set("label", v.label.trim());
    fd.set("startDate", todayIso());
    fd.set("principalCents", principal.toString());
    fd.set("termMonths", String(v.remainingInstallments));
    fd.set("monthlyInstallmentCents", v.monthlyInstallmentCents.toString());
    // Taxa em branco: o backend resolve ~0% a partir de principal/parcela/prazo.
    fd.set("annualRatePct", "");
    fd.set("dueDay", "");
    fd.set("notes", "");

    startTransition(async () => {
      const r = await createDebtAction(fd);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      await invalidateDebtCaches(queryClient);
      router.push(`/app/dividas/${r.data.debtId}` as Route);
    });
  }

  const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

  if (step === 1) {
    return (
      <WizardShell
        currentStep={1}
        totalSteps={2}
        title="Sua dívida"
        description="O que você sabe de cabeça: quanto paga por mês e quantas faltam."
        onBack={() => router.push("/app/dividas/nova" as Route)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToConfirm();
          },
          icon: arrowRight,
        }}
      >
        <WizardField label="Nome" htmlFor={labelId} error={errors.label?.message}>
          <input
            id={labelId}
            {...form.register("label")}
            placeholder="Ex: Empréstimo do banco, financiamento do carro"
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField
          label="Quanto você paga por mês"
          htmlFor={installmentId}
          error={errors.monthlyInstallmentCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="monthlyInstallmentCents"
            id={installmentId}
            placeholder="R$ 0,00"
            currency={defaultCurrency}
          />
        </WizardField>

        <WizardField
          label="Faltam quantas parcelas"
          helper="Mais ou menos. Dá pra ajustar depois."
          htmlFor={remainingId}
          error={errors.remainingInstallments?.message}
        >
          <input
            id={remainingId}
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            placeholder="Ex: 12"
            {...form.register("remainingInstallments", { valueAsNumber: true })}
            className={wizardInputClass}
          />
        </WizardField>

        <button
          type="button"
          onClick={() =>
            onWantDetailed({
              label: values.label?.trim() || "Empréstimo",
              monthlyInstallmentCents: installmentCents,
              remainingInstallments: remaining,
            })
          }
          className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          Sabe a taxa e quantas faltam? Preencher tudo
        </button>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      currentStep={2}
      totalSteps={2}
      title="Confere e salva"
      description="Esses são os números. Pode ajustar depois."
      onBack={() => setStep(1)}
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
        label="Vai sair do seu mês"
        value={formatCentsBRL(installmentCents)}
        sub={`Faltam ${parcelas(remaining)}, uns ${formatCentsBRL(balanceCents)} no total`}
      />

      <SummaryList
        items={[
          { label: "Nome", value: values.label || "Sem nome" },
          { label: "Paga por mês", value: formatCentsBRL(installmentCents) },
          { label: "Faltam", value: parcelas(remaining) },
          { label: "Total a pagar", value: formatCentsBRL(balanceCents) },
        ]}
      />

      <p className="text-[0.75rem] leading-snug text-[color:var(--text-muted)]">
        O total é uma estimativa pelo que falta pagar. Se souber a taxa e o saldo exato, dá pra
        deixar mais certinho depois, no detalhe da dívida.
      </p>

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
