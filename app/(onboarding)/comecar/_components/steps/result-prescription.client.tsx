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
      title="Seu proximo passo"
      description="Com base no que voce cadastrou, esse e o movimento certo agora."
      primary={{ label: "Ir para o inicio", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <p className="text-sm opacity-70">Calculando...</p>
      ) : data && data.hasPlan && data.prescription ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm opacity-70">Seu plano deste mes esta pronto. Veja os detalhes no inicio.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm opacity-70">Otimo comeco. No inicio voce vai ver seu movimento do mes.</p>
        </div>
      )}
    </WizardShell>
  );
}
