"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";
import { formatCents } from "@/shared/format/money-format";

import { createDebtAction } from "../../../_actions/create-debt.action";
import { todayIso } from "@/shared/format/dates";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { BankCombobox } from "../../_components/bank-combobox";
import { ComputedCard } from "../../_components/computed-card";
import { SummaryList } from "@/ui/summary-list";
import { WizardField } from "@/ui/wizard-field";
import { WizardMoneyField } from "@/ui/wizard-money-field";
import { WizardShell } from "@/app/(app)/app/_components/wizard-shell";
import { DEBT_RATE_ESTIMATES } from "../../_lib/debt-rate-estimates";

const formSchema = z.object({
  label: z.string().min(1, "Informe um nome.").max(120),
  currency: z.enum(CURRENCIES),
  currentBalanceCents: z.bigint().positive("Saldo deve ser positivo."),
  bankName: z.string().min(1, "Informe o banco.").max(120),
  monthlyRatePct: z.number().min(0).max(1000),
  startDate: z.string().min(1, "Informe a data de início."),
  expectedEndDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;


// Colapsado pra 2 telas: o ICP so sabe "quanto to no vermelho". A taxa entra com
// o teto legal do cheque especial (8%/mes) como ponto de partida honesto e
// ajustavel depois no detalhe da divida.
type Step = 2 | 3;

const ESSENTIAL_FIELDS = ["currentBalanceCents"] as const;

function formatAmount(cents: bigint | null | undefined, currency: Currency): string {
  return formatCents(cents ?? 0n, currency);
}

export interface OverdraftSeed {
  currentBalanceCents: bigint;
  bankName: string;
}

export function OverdraftForm({
  defaultCurrency = "BRL",
  onWantDetailed,
}: { defaultCurrency?: Currency; onWantDetailed?: (seed: OverdraftSeed) => void } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(2);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const labelId = useId();
  const bankId = useId();
  const balanceId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "Cheque especial",
      currency: defaultCurrency,
      currentBalanceCents: 0n as unknown as bigint,
      bankName: "Banco",
      monthlyRatePct: DEBT_RATE_ESTIMATES.overdraft.valuePct,
      startDate: todayIso(),
      expectedEndDate: null,
      notes: null,
    },
  });

  const values = form.watch();
  const errors = form.formState.errors;
  const currency: Currency = values.currency ?? defaultCurrency;

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

  async function goToConfirm() {
    if (!values.bankName.trim()) form.setValue("bankName", "Banco");
    const valid = await form.trigger(ESSENTIAL_FIELDS);
    if (valid) setStep(3);
  }

  async function handleSubmit() {
    setServerError(null);
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    const fd = new FormData();
    fd.set("label", v.label);
    fd.set("currency", v.currency);
    fd.set("currentBalanceCents", v.currentBalanceCents.toString());
    fd.set("bankName", v.bankName);
    fd.set("monthlyRatePct", String(v.monthlyRatePct));
    fd.set("startDate", v.startDate);
    fd.set("expectedEndDate", v.expectedEndDate ?? "");
    fd.set("notes", v.notes ?? "");
    startTransition(async () => {
      fd.set("kind", "overdraft");
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

  if (step === 2) {
    return (
      <WizardShell
        currentStep={1}
        totalSteps={2}
        title="Tô no vermelho"
        description="Só me diz quanto a conta está negativa agora."
        onBack={() => router.push("/app/dividas/nova" as Route)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToConfirm();
          },
          icon: arrowRight,
        }}
      >
        <WizardField
          label="Quanto você está no vermelho"
          htmlFor={balanceId}
          error={errors.currentBalanceCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="currentBalanceCents"
            id={balanceId}
            placeholder="R$ 0,00"
            currency={currency}
            onCurrencyChange={(c) => form.setValue("currency", c)}
          />
        </WizardField>

        <WizardField label="Banco (opcional)" htmlFor={bankId} error={errors.bankName?.message}>
          <BankCombobox
            id={bankId}
            value={values.bankName === "Banco" ? "" : values.bankName}
            onChange={(b) => {
              form.setValue("bankName", b.trim() || "Banco", { shouldValidate: true });
              form.setValue(
                "label",
                b.trim() ? `Cheque especial ${b.trim()}` : "Cheque especial",
                { shouldValidate: true },
              );
            }}
            placeholder="Ex: Itaú, Nubank, Caixa..."
          />
        </WizardField>

        <input id={labelId} type="hidden" {...form.register("label")} />

        <p className="text-[0.75rem] leading-snug text-[color:var(--text-muted)]">
          A gente já assume o teto legal de juros do cheque especial. Se souber a sua taxa, ajusta
          depois no detalhe.
        </p>

        {onWantDetailed ? (
          <button
            type="button"
            onClick={() =>
              onWantDetailed({
                currentBalanceCents:
                  typeof values.currentBalanceCents === "bigint" ? values.currentBalanceCents : 0n,
                bankName: values.bankName,
              })
            }
            className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
          >
            Sabe a taxa do cheque especial? Preencher tudo
          </button>
        ) : null}
      </WizardShell>
    );
  }

  // step 3: confirma
  const interestText = monthlyInterestCents
    ? formatAmount(monthlyInterestCents, currency)
    : "Informe taxa para calcular";

  return (
    <WizardShell
      currentStep={2}
      totalSteps={2}
      title="Confere e salva"
      description="Esses são os números. Pode ajustar depois."
      onBack={() => setStep(2)}
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
        sub="Pelo teto legal do cheque especial"
      />

      <SummaryList
        items={[
          { label: "Tipo", value: "Cheque especial" },
          { label: "Quanto está no vermelho", value: formatAmount(values.currentBalanceCents, currency) },
          {
            label: "Juros estimados",
            value: monthlyInterestCents
              ? `${formatAmount(monthlyInterestCents, currency)}/mês (teto legal)`
              : "Teto legal do cheque especial",
          },
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
