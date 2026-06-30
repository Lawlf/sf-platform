"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fetchDebts } from "@/app/(app)/app/_actions/debt-queries";
import { MoneyInput } from "@/app/(app)/app/_components/money-input";
import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { todayIso } from "@/shared/format/dates";

import { upsertOnboardingDebtAction } from "../../_actions/onboarding-entities";

import {
  formatCents,
  ResultHintCard,
  ResultPreviewHint,
  ResultPreviewLoading,
  ResultStatCard,
  useMonthlyIncomeCents,
} from "./result-preview.client";

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";
const labelClass =
  "mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80";

const schema = z.object({
  label: z.string().min(1, "Informe um nome."),
  creditLimitCents: z.bigint().nullable(),
  currentStatementCents: z.bigint().positive("Informe a fatura atual."),
});
type FormValues = z.infer<typeof schema>;

function burdenText(totalDebtCents: bigint, incomeCents: bigint): string | null {
  if (incomeCents <= 0n) return null;
  const ratio = Number(totalDebtCents) / Number(incomeCents);
  if (ratio < 1) return `equivale a ${Math.round(ratio * 100)}% da sua renda do mês`;
  return `equivale a ${ratio.toFixed(1).replace(".", ",")} meses da sua renda`;
}

export function DebtStep({
  stepNumber,
  totalSteps,
  onDone,
  onBack,
  onSkip,
}: {
  stepNumber: WizardStep;
  totalSteps: number;
  onDone: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [saving, startSaving] = useTransition();
  const { cents: incomeCents } = useMonthlyIncomeCents();
  // Dívidas já cadastradas antes desta (em onboarding novo costuma ser 0n).
  const [existingDebtCents, setExistingDebtCents] = useState<bigint | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "Cartão de crédito",
      creditLimitCents: null,
      currentStatementCents: 0n as unknown as bigint,
    },
  });

  useEffect(() => {
    let active = true;
    fetchDebts({ status: "active" })
      .then((debts) => {
        if (!active) return;
        setExistingDebtCents(debts.reduce((acc, d) => acc + BigInt(d.currentBalance.cents), 0n));
      })
      .catch((e) => {
        console.error("fetchDebts (onboarding) falhou", e);
        if (active) setExistingDebtCents(0n);
      });
    return () => {
      active = false;
    };
  }, []);

  function onSubmit(values: FormValues) {
    startSaving(async () => {
      const fd = new FormData();
      fd.set("label", values.label.trim());
      // creditCardFormSchema: positiveBigint / nonNegativeBigint transforms (string -> BigInt)
      fd.set("creditLimitCents", values.creditLimitCents ? values.creditLimitCents.toString() : "");
      fd.set("currentStatementCents", values.currentStatementCents.toString());
      // z.coerce.number().int().min(1).max(31)
      fd.set("statementDay", "1");
      fd.set("dueDay", "10");
      // Rotativo fica de fora do onboarding: só existe se a fatura não for paga.
      // Vazio -> null no validator; usuário informa depois no editor da dívida.
      fd.set("revolvingMonthlyRatePct", "");
      fd.set("startDate", todayIso());
      const res = await upsertOnboardingDebtAction(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      onDone();
    });
  }

  const typedStatement = form.watch("currentStatementCents");
  const typedCents = typeof typedStatement === "bigint" ? typedStatement : 0n;
  const label = form.watch("label");

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="Seu cartão de crédito"
      description="Comece pelo cartão, que costuma pesar mais. Empréstimo, financiamento ou cheque especial você soma depois. Aqui embaixo já aponta por onde atacar."
      onBack={onBack}
      primary={{ label: "Continuar", onClick: form.handleSubmit(onSubmit), loading: saving }}
      secondary={{ label: "Pular esta etapa", onClick: onSkip }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="onb-debt-label">
            Nome
          </label>
          <input id="onb-debt-label" {...form.register("label")} className={fieldClass} />
          {form.formState.errors.label ? (
            <span role="alert" className="mt-1 text-[0.6875rem] text-[color:var(--semantic-negative)]">
              {form.formState.errors.label.message}
            </span>
          ) : null}
        </div>

        <MoneyInput control={form.control} name="currentStatementCents" label="Fatura atual" required />
        <MoneyInput control={form.control} name="creditLimitCents" label="Limite (opcional)" />
      </div>

      <div className="mt-1 flex flex-col gap-3">
        <DebtPreview
          incomeCents={incomeCents}
          existingDebtCents={existingDebtCents}
          typedCents={typedCents}
          label={label}
        />
      </div>
    </WizardShell>
  );
}

function DebtPreview({
  incomeCents,
  existingDebtCents,
  typedCents,
  label,
}: {
  incomeCents: bigint | null;
  existingDebtCents: bigint | null;
  typedCents: bigint;
  label: string;
}) {
  if (incomeCents === null || existingDebtCents === null) {
    return <ResultPreviewLoading />;
  }
  if (typedCents <= 0n) {
    return <ResultPreviewHint>Digite a fatura pra ver o tamanho da dívida.</ResultPreviewHint>;
  }

  const totalDebt = existingDebtCents + typedCents;
  const ratio = incomeCents > 0n ? Number(totalDebt) / Number(incomeCents) : null;
  const heavy = ratio !== null && ratio >= 3;
  const burden = burdenText(totalDebt, incomeCents);
  const attackName = label.trim() || "Cartão de crédito";

  return (
    <>
      <ResultStatCard
        eyebrow={existingDebtCents > 0n ? "O total que você deve" : "O que você deve nessa dívida"}
        value={formatCents(totalDebt)}
        negative={heavy}
        caption={burden ? `${burden}.` : undefined}
      />
      <ResultHintCard eyebrow="Ataque primeiro">
        <p className="text-lg font-bold text-[color:var(--text-primary)]">{attackName}</p>
        <p className="mt-1 text-[color:var(--text-secondary)]">
          O rotativo do cartão costuma ser o juro mais caro, então é o palpite mais seguro pra começar.
        </p>
        <p className="mt-2 text-[0.75rem] text-[color:var(--text-muted)]">
          Quando você anotar a taxa de juros das suas dívidas, a home confirma qual custa mais e ajusta a
          ordem se precisar.
        </p>
      </ResultHintCard>
    </>
  );
}
