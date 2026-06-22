"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { MoneyInput } from "@/app/(app)/app/_components/money-input";
import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";

import { upsertOnboardingExpenseAction } from "../../_actions/onboarding-entities";

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";
const labelClass =
  "mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "moradia", label: "Moradia (aluguel, condomínio)" },
  { key: "contas", label: "Contas (água, luz, internet)" },
  { key: "mercado", label: "Mercado" },
  { key: "alimentacao", label: "Alimentação" },
  { key: "transporte", label: "Transporte" },
  { key: "saude", label: "Saúde" },
  { key: "assinaturas", label: "Assinaturas" },
  { key: "educacao", label: "Educação" },
  { key: "lazer", label: "Lazer" },
  { key: "compras", label: "Compras" },
  { key: "outros", label: "Outros" },
];

const schema = z.object({
  label: z.string().min(1, "Informe um nome."),
  recurringAmountCents: z.bigint().positive("Informe quanto sai por mês."),
  expenseCategory: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ExpenseStep({
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
      label: "Aluguel",
      recurringAmountCents: 0n as unknown as bigint,
      expenseCategory: "moradia",
    },
  });

  function onSubmit(values: FormValues) {
    startSaving(async () => {
      const fd = new FormData();
      fd.set("label", values.label.trim());
      fd.set("recurringAmountCents", values.recurringAmountCents.toString());
      fd.set("recurringFrequency", "monthly");
      fd.set("currency", "BRL");
      fd.set("expenseCategory", values.expenseCategory);
      fd.set("startDate", todayIso());
      fd.set("endDate", "");
      fd.set("dueDay", "");
      const res = await upsertOnboardingExpenseAction(fd);
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
      title="Uma conta fixa do mês"
      description="A maior que sai todo mês: aluguel, mercado, internet. Só uma agora, as outras você soma depois. Com ela já dá pra ver se o mês fecha."
      onBack={onBack}
      primary={{ label: "Ver se o mês fecha", onClick: form.handleSubmit(onSubmit), loading: saving }}
      secondary={{ label: "Pular esta etapa", onClick: onSkip }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="onb-expense-label">
            Nome
          </label>
          <input id="onb-expense-label" {...form.register("label")} className={fieldClass} />
          {form.formState.errors.label ? (
            <span role="alert" className="mt-1 text-[0.6875rem] text-[color:var(--semantic-negative)]">
              {form.formState.errors.label.message}
            </span>
          ) : null}
        </div>

        <MoneyInput control={form.control} name="recurringAmountCents" label="Quanto sai por mês" required />

        <div>
          <label className={labelClass} htmlFor="onb-expense-category">
            Tipo
          </label>
          <select id="onb-expense-category" {...form.register("expenseCategory")} className={fieldClass}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </WizardShell>
  );
}
