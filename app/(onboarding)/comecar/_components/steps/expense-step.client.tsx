"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fetchDashboardSnapshot } from "@/app/(app)/app/_actions/dashboard-queries";
import { MoneyInput } from "@/app/(app)/app/_components/money-input";
import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";

import { upsertOnboardingExpenseAction } from "../../_actions/onboarding-entities";

import {
  formatCents,
  ResultHintCard,
  ResultPreviewHint,
  ResultPreviewLoading,
  ResultStatCard,
} from "./result-preview.client";

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
  // Saldo livre do mês SEM esta despesa (renda menos o que já existe). Subtraímos
  // o valor digitado pra prever a sobra ao vivo.
  const [baseline, setBaseline] = useState<{ freeCents: bigint; incomeCents: bigint } | null>(null);
  const [baselineFailed, setBaselineFailed] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "Aluguel",
      recurringAmountCents: 0n as unknown as bigint,
      expenseCategory: "moradia",
    },
  });

  useEffect(() => {
    let active = true;
    fetchDashboardSnapshot()
      .then((s) => {
        if (!active) return;
        if (s == null) {
          setBaselineFailed(true);
          return;
        }
        setBaseline({
          freeCents: BigInt(s.monthlyFreeCashFlow.cents),
          incomeCents: BigInt(s.totalIncome.cents),
        });
      })
      .catch((e) => {
        console.error("fetchDashboardSnapshot (onboarding despesa) falhou", e);
        if (active) setBaselineFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

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

  const typed = form.watch("recurringAmountCents");
  const typedCents = typeof typed === "bigint" ? typed : 0n;

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="Uma conta fixa do mês"
      description="A maior que sai todo mês: aluguel, mercado, internet. Só uma agora, as outras você soma depois. Aqui embaixo já mostra se o mês fecha."
      onBack={onBack}
      primary={{ label: "Continuar", onClick: form.handleSubmit(onSubmit), loading: saving }}
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

      <div className="mt-1 flex flex-col gap-3">
        <ExpensePreview
          baseline={baseline}
          baselineFailed={baselineFailed}
          typedCents={typedCents}
        />
      </div>
    </WizardShell>
  );
}

function ExpensePreview({
  baseline,
  baselineFailed,
  typedCents,
}: {
  baseline: { freeCents: bigint; incomeCents: bigint } | null;
  baselineFailed: boolean;
  typedCents: bigint;
}) {
  if (baselineFailed) {
    return <ResultPreviewHint>A conta do mês você confere no início.</ResultPreviewHint>;
  }
  if (baseline === null) {
    return <ResultPreviewLoading />;
  }
  if (baseline.incomeCents === 0n) {
    return <ResultPreviewHint>Falta a renda pra fechar a conta. Adicione quando quiser.</ResultPreviewHint>;
  }
  if (typedCents <= 0n) {
    return <ResultPreviewHint>Digite o valor pra ver se o mês fecha.</ResultPreviewHint>;
  }

  const sobra = baseline.freeCents - typedCents;
  const positive = sobra >= 0n;
  const abs = positive ? sobra : -sobra;

  return (
    <>
      <ResultStatCard
        eyebrow={positive ? "Sobra no fim do mês" : "Falta no fim do mês"}
        value={formatCents(abs)}
        negative={!positive}
        caption={
          positive
            ? "Com o que você cadastrou, sobraria isso no fim do mês."
            : "Com o que você cadastrou, faltaria isso pra fechar o mês."
        }
      />
      <ResultHintCard eyebrow="Seu próximo passo">
        {positive
          ? "Antes de gastar, separe parte dessa sobra. No mês fraco é ela que segura."
          : "Some suas dívidas e contas no início pra ver o tamanho real e onde dá pra cortar."}
      </ResultHintCard>
    </>
  );
}
