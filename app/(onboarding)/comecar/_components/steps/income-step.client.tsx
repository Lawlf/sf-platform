"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { MoneyInput } from "@/app/(app)/app/_components/money-input";
import { WizardShell, type WizardStep } from "@/app/(app)/app/_components/wizard-shell";
import { todayIso } from "@/shared/format/dates";

import { upsertOnboardingIncomeAction } from "../../_actions/onboarding-entities";

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";
const labelClass =
  "mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80";

const schema = z.object({
  label: z.string().min(1, "Informe um nome."),
  amountCents: z.bigint().positive("Informe um valor válido."),
});
type FormValues = z.infer<typeof schema>;


export function IncomeStep({
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
    defaultValues: { label: "", amountCents: 0n as unknown as bigint },
  });

  function onSubmit(values: FormValues) {
    startSaving(async () => {
      const fd = new FormData();
      fd.set("label", values.label.trim());
      fd.set("amountCents", values.amountCents.toString());
      fd.set("frequency", "monthly");
      fd.set("startDate", todayIso());
      const res = await upsertOnboardingIncomeAction(fd);
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
      title="Quanto entra por mês?"
      description="Quanto você costuma receber por mês. Se varia muito, põe uma média. Só um número já ajuda."
      onBack={onBack}
      primary={{ label: "Continuar", onClick: form.handleSubmit(onSubmit), loading: saving }}
      secondary={{ label: "Pular esta etapa", onClick: onSkip }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="onb-income-label">
            Nome
          </label>
          <input
            id="onb-income-label"
            {...form.register("label")}
            placeholder="Ex: clientes, freela, app, comissão"
            className={fieldClass}
          />
          {form.formState.errors.label ? (
            <span role="alert" className="mt-1 text-[0.6875rem] text-[color:var(--semantic-negative)]">
              {form.formState.errors.label.message}
            </span>
          ) : null}
        </div>

        <MoneyInput control={form.control} name="amountCents" label="Renda mensal" required />
      </div>
    </WizardShell>
  );
}
