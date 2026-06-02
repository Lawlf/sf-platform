"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { MoneyInput } from "@/app/(app)/app/_components/money-input";
import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { upsertOnboardingDebtAction } from "../../_actions/onboarding-entities";

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";
const labelClass =
  "mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80";

const schema = z.object({
  label: z.string().min(1, "Informe um nome."),
  creditLimitCents: z.bigint().positive("Informe o limite."),
  currentStatementCents: z.bigint().positive("Informe a fatura atual."),
});
type FormValues = z.infer<typeof schema>;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "Cartão de crédito",
      creditLimitCents: 0n as unknown as bigint,
      currentStatementCents: 0n as unknown as bigint,
    },
  });

  function onSubmit(values: FormValues) {
    startSaving(async () => {
      const fd = new FormData();
      fd.set("label", values.label.trim());
      // creditCardFormSchema: positiveBigint / nonNegativeBigint transforms (string -> BigInt)
      fd.set("creditLimitCents", values.creditLimitCents.toString());
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

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="Seu cartão de crédito"
      description="Comece pelo que mais pesa. Só um agora, os outros você soma depois. Com um já dá pra te mostrar por onde atacar."
      onBack={onBack}
      primary={{ label: "Ver meu próximo passo", onClick: form.handleSubmit(onSubmit), loading: saving }}
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
        <MoneyInput control={form.control} name="creditLimitCents" label="Limite" required />
      </div>
    </WizardShell>
  );
}
