"use client";

import { useEffect, useState } from "react";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { fetchPrescription } from "@/app/(app)/app/_actions/prescription-queries";

// fetchPrescription returns PrescriptionViewPayload | null
// PrescriptionViewPayload: { isPro, hasPlan, state, prescription, teaser }
type Payload = Awaited<ReturnType<typeof fetchPrescription>>;

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
  const [data, setData] = useState<Payload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPrescription().then((d) => {
      if (active) {
        setData(d);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="Seu próximo passo"
      description="Com base no que você cadastrou, esse é o movimento certo agora."
      primary={{ label: "Ir para o início", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <p className="text-sm opacity-70">Calculando...</p>
      ) : data && data.hasPlan && data.prescription ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm opacity-70">Seu plano deste mês está pronto. Veja os detalhes no início.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm opacity-70">Ótimo começo. No início você vai ver seu movimento do mês.</p>
        </div>
      )}
    </WizardShell>
  );
}
