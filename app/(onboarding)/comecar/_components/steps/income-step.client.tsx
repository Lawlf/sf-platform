"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { createIncomeAction } from "@/app/(app)/app/renda/_actions/create-income.action";

function todayIso(): string {
  // Server actions accept an ISO date string; build from the client date.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function IncomeStep({
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
  const [label, setLabel] = useState("Salário");
  const [reais, setReais] = useState("");
  const [saving, startSaving] = useTransition();

  function submit() {
    const value = Number(reais.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe um valor de renda válido.");
      return;
    }
    const amountCents = BigInt(Math.round(value * 100));
    startSaving(async () => {
      const fd = new FormData();
      fd.set("label", label.trim() || "Renda");
      fd.set("amountCents", amountCents.toString());
      fd.set("frequency", "monthly");
      fd.set("startDate", todayIso());
      const res = await createIncomeAction(fd);
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
      description="Sua renda mensal líquida aproximada. Só um número já ajuda."
      onBack={onBack}
      primary={{ label: "Continuar", onClick: submit, loading: saving, disabled: reais.trim() === "" }}
      secondary={{ label: "Pular por agora", onClick: onSkipAll }}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Nome
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Renda mensal (R$)
          <input
            inputMode="decimal"
            value={reais}
            onChange={(e) => setReais(e.target.value)}
            placeholder="3500,00"
            className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 font-normal"
          />
        </label>
      </div>
    </WizardShell>
  );
}
