"use client";

import { useEffect, useState } from "react";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { fetchNetWorth } from "@/app/(app)/app/_actions/asset-queries";

type Snapshot = Awaited<ReturnType<typeof fetchNetWorth>>;

export function ResultNetWorth({
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
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchNetWorth().then((s) => {
      if (active) {
        setSnap(s);
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
      title="Sua foto financeira"
      description="Esse e seu patrimonio liquido agora. Ele cresce conforme voce cadastra."
      primary={{ label: "Ir para o inicio", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <p className="text-sm opacity-70">Calculando...</p>
      ) : snap ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="font-semibold">
            {snap.netWorthIsNegative ? "Patrimonio negativo" : "Patrimonio"}
          </p>
          <p className="mt-1 text-sm opacity-70">
            {snap.netWorth.formatted} liquido. Veja o detalhe no inicio.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm opacity-70">Seu patrimonio esta montado. Veja o detalhe no inicio.</p>
        </div>
      )}
    </WizardShell>
  );
}
