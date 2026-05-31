"use client";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";

// Resultado do fluxo "pagar-divida": entrega um ganho gratis (o usuario ja sabe que
// seus dados estao completos e qual divida pesa) e apresenta o plano detalhado como
// aspiracao Pro, sem parede borrada no meio do onboarding. A prescricao completa fica
// no NextStepCard da home, que ja respeita o paywall.
export function ResultPrescription({
  stepNumber,
  totalSteps,
  onFinish,
  finishing,
}: {
  stepNumber: WizardStep;
  totalSteps: number;
  onFinish: () => void;
  finishing: boolean;
}) {
  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="Tudo pronto"
      description="Seus dados já estão completos."
      primary={{ label: "Ir para o início", onClick: onFinish, loading: finishing }}
    >
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
        <p className="font-semibold">Você já sabe por onde atacar.</p>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          Seus dados mostram qual dívida pesa mais no seu mês.
        </p>
        <p className="mt-3 text-[0.75rem] text-[color:var(--text-muted)]">
          No Pro: o plano completo, quanto você economiza e em quantos meses fica livre.
        </p>
      </div>
    </WizardShell>
  );
}
