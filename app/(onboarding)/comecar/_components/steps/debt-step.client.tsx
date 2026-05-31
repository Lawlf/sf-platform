"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { createDebtAction } from "@/app/(app)/app/dividas/_actions/create-debt.action";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toCents(reais: string): bigint | null {
  const v = Number(reais.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(v) || v < 0) return null;
  return BigInt(Math.round(v * 100));
}

export function DebtStep({
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
  const [label, setLabel] = useState("Cartao de credito");
  const [statement, setStatement] = useState("");
  const [limit, setLimit] = useState("");
  const [ratePct, setRatePct] = useState("");
  const [saving, startSaving] = useTransition();

  function submit() {
    const statementCents = toCents(statement);
    const limitCents = toCents(limit);
    const rate = Number(ratePct.replace(",", "."));
    if (statementCents === null || limitCents === null) {
      toast.error("Informe valores validos.");
      return;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error("Informe a taxa do rotativo (% ao mes).");
      return;
    }
    startSaving(async () => {
      const fd = new FormData();
      fd.set("label", label.trim() || "Cartao");
      // creditCardFormSchema uses positiveBigint (string -> BigInt transform)
      fd.set("creditLimitCents", limitCents.toString());
      // nonNegativeBigint for currentStatementCents
      fd.set("currentStatementCents", statementCents.toString());
      // z.coerce.number().int().min(1).max(31)
      fd.set("statementDay", "1");
      fd.set("dueDay", "10");
      // z.coerce.number().min(0).max(1000) - number as string
      fd.set("revolvingMonthlyRatePct", String(rate));
      fd.set("startDate", todayIso());
      const res = await createDebtAction("credit_card", fd);
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
      title="Sua maior divida"
      description="Comece pelo cartao. So o essencial para calcular seu proximo passo."
      onBack={onBack}
      primary={{ label: "Ver meu proximo passo", onClick: submit, loading: saving }}
      secondary={{ label: "Pular por agora", onClick: onSkipAll }}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Nome
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Fatura atual (R$)
          <input inputMode="decimal" value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="2000,00" className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Limite (R$)
          <input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="5000,00" className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Juros do rotativo (% ao mes)
          <input inputMode="decimal" value={ratePct} onChange={(e) => setRatePct(e.target.value)} placeholder="14,5" className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 font-normal" />
        </label>
      </div>
    </WizardShell>
  );
}
