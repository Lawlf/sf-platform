"use client";

import { useEffect, useState } from "react";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { fetchGoalsWithProgress } from "@/app/(app)/app/metas/_actions/goal-queries";

type Goals = Awaited<ReturnType<typeof fetchGoalsWithProgress>>;

export function ResultGoal({
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
  const [goals, setGoals] = useState<Goals>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchGoalsWithProgress().then((g) => {
      if (active) {
        setGoals(g);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const first = goals[0];

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="Sua meta esta criada"
      description="Acompanhe o progresso e a previsao no inicio."
      primary={{ label: "Ir para o inicio", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <p className="text-sm opacity-70">Carregando...</p>
      ) : first ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="font-semibold">{first.goal.title}</p>
          <p className="mt-1 text-sm opacity-70">
            Progresso: {first.progress.pct}%
            {first.progress.etaMonths !== null
              ? ` - estimativa de ${first.progress.etaMonths} meses para concluir.`
              : " - cadastre quanto guarda por mes para ver a previsao."}
          </p>
        </div>
      ) : (
        <p className="text-sm opacity-70">Sua meta foi criada. Veja no inicio.</p>
      )}
    </WizardShell>
  );
}
