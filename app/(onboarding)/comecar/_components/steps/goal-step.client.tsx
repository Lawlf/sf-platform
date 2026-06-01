"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { createGoalAction } from "@/app/(app)/app/metas/_actions/goal-actions";

export function GoalStep({
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
  const [months, setMonths] = useState("6");
  const [saving, startSaving] = useTransition();

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
      description="Quantos meses de gastos você quer ter guardado? O padrão é 6."
      onBack={onBack}
      primary={{ label: "Criar minha meta", onClick: submit, loading: saving }}
      secondary={{ label: "Pular por agora", onClick: onSkipAll }}
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
    </WizardShell>
  );
}
