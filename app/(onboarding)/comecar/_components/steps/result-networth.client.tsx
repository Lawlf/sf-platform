"use client";

import { useEffect, useState } from "react";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { fetchNetWorth } from "@/app/(app)/app/_actions/asset-queries";
import { Spinner } from "@/app/components/ui/spinner";

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
      description="Esse é seu patrimônio líquido agora. Ele cresce conforme você cadastra."
      primary={{ label: "Ir para o início", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <div className="flex justify-center py-6"><Spinner size={24} /></div>
      ) : snap ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Patrimônio líquido
          </p>
          <p className="mt-1 text-[2rem] font-extrabold leading-none">{snap.netWorth.formatted}</p>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Ativos: {snap.totalAssets.formatted}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm text-[color:var(--text-secondary)]">Seu patrimônio está montado. Veja o detalhe no início.</p>
        </div>
      )}
    </WizardShell>
  );
}
