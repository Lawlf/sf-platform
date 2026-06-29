"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { createGoalAction } from "@/app/(app)/app/metas/_actions/goal-actions";

import {
  formatCents,
  ResultHintCard,
  ResultPreviewHint,
  ResultPreviewLoading,
  ResultStatCard,
  useMonthlyIncomeCents,
} from "./result-preview.client";

export function GoalStep({
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
  const [months, setMonths] = useState("6");
  const [saving, startSaving] = useTransition();
  const { cents: incomeCents } = useMonthlyIncomeCents();

  function submit() {
    const targetMonths = Number(months);
    if (!Number.isInteger(targetMonths) || targetMonths <= 0) {
      toast.error("Escolha quantos meses de reserva.");
      return;
    }
    startSaving(async () => {
      const res = await createGoalAction({
        type: "emergency_fund",
        title: "Reserva de emergência",
        targetMonths,
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
      title="Sua reserva de emergência"
      description="Quantos meses de gastos você quer ter guardado? O padrão é 6. Aqui embaixo já mostra o alvo."
      onBack={onBack}
      primary={{ label: "Continuar", onClick: submit, loading: saving }}
      secondary={{ label: "Pular esta etapa", onClick: onSkip }}
    >
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Meses de reserva
        <select
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 font-normal"
        >
          <option value="3">3 meses</option>
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
        </select>
      </label>

      <div className="mt-1 flex flex-col gap-3">
        <GoalPreview incomeCents={incomeCents} months={Number(months)} />
      </div>
    </WizardShell>
  );
}

function GoalPreview({ incomeCents, months }: { incomeCents: bigint | null; months: number }) {
  if (incomeCents === null) {
    return <ResultPreviewLoading />;
  }
  if (incomeCents === 0n) {
    return <ResultPreviewHint>Falta a renda pra dimensionar a reserva. Adicione quando quiser.</ResultPreviewHint>;
  }

  // Custo de vida estimado em ~75% da renda, mesmo critério que a home usa.
  const monthlyCost = (incomeCents * 3n) / 4n;
  const target = monthlyCost * BigInt(Math.max(0, months));

  return (
    <>
      <ResultStatCard
        eyebrow="Sua reserva (alvo)"
        value={formatCents(target)}
        caption={`${months} ${months === 1 ? "mês" : "meses"} de um custo de vida de ~${formatCents(monthlyCost)}.`}
      />
      <ResultHintCard eyebrow="Seu próximo passo">
        <p>No primeiro mês que sobrar, separe um pouco aqui. Cada vez que guardar, registre e a barra anda.</p>
        <p className="mt-2 text-[0.75rem] text-[color:var(--text-muted)]">
          Estimamos seu custo de vida em ~75% da renda pra dimensionar a reserva. Você ajusta isso depois.
        </p>
      </ResultHintCard>
    </>
  );
}
