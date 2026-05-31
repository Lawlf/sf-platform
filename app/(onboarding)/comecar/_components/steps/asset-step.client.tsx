"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { MoneyInput } from "@/app/(app)/app/_components/money-input";
import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { createAssetAction } from "@/app/(app)/app/patrimonio/novo/_actions/create-asset.action";

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";
const labelClass =
  "mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80";

const schema = z.object({
  label: z.string().min(1, "Informe um nome."),
  currentValueCents: z.bigint().positive("Informe um valor válido."),
});
type FormValues = z.infer<typeof schema>;

export function AssetStep({
  stepNumber,
  totalSteps,
  onDone,
  onBack,
  onSkipAll,
}: {
  stepNumber: WizardStep;
  totalSteps: number;
  onDone: () => void;
  onBack: () => void;
  onSkipAll: () => void;
}) {
  const [saving, startSaving] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: "Reserva / conta", currentValueCents: 0n as unknown as bigint },
  });

  function onSubmit(values: FormValues) {
    startSaving(async () => {
      const res = await createAssetAction({
        category: "cash",
        label: values.label.trim(),
        currentValueCents: values.currentValueCents.toString(),
        metadataJson: null,
        acquiredAt: null,
        allocations: [],
        depreciationKind: "stable",
      });
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
      title="O que você já tem"
      description="Seu dinheiro guardado ou um bem. Só um item já monta sua foto."
      onBack={onBack}
      primary={{ label: "Ver meu patrimônio", onClick: form.handleSubmit(onSubmit), loading: saving }}
      secondary={{ label: "Pular por agora", onClick: onSkipAll }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="onb-asset-label">
            Nome
          </label>
          <input id="onb-asset-label" {...form.register("label")} className={fieldClass} />
          {form.formState.errors.label ? (
            <span role="alert" className="mt-1 text-[0.6875rem] text-[color:var(--semantic-negative)]">
              {form.formState.errors.label.message}
            </span>
          ) : null}
        </div>

        <MoneyInput control={form.control} name="currentValueCents" label="Valor atual" required />
      </div>
    </WizardShell>
  );
}
