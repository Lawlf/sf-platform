"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { createAssetAction } from "@/app/(app)/app/patrimonio/novo/_actions/create-asset.action";

function toCents(reais: string): string | null {
  const v = Number(reais.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(v) || v < 0) return null;
  return String(Math.round(v * 100));
}

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
  const [label, setLabel] = useState("Reserva / conta");
  const [value, setValue] = useState("");
  const [saving, startSaving] = useTransition();

  function submit() {
    const currentValueCents = toCents(value);
    if (currentValueCents === null) {
      toast.error("Informe um valor valido.");
      return;
    }
    startSaving(async () => {
      const res = await createAssetAction({
        category: "cash",
        label: label.trim() || "Conta",
        currentValueCents,
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
      title="O que voce ja tem"
      description="Seu dinheiro guardado ou um bem. So um item ja monta sua foto."
      onBack={onBack}
      primary={{ label: "Ver meu patrimonio", onClick: submit, loading: saving }}
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
          Valor atual (R$)
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="10000,00"
            className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 font-normal"
          />
        </label>
      </div>
    </WizardShell>
  );
}
