"use client";

import { useEffect, useState } from "react";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { fetchGoalsWithProgress } from "@/app/(app)/app/metas/_actions/goal-queries";
import { Spinner } from "@/app/components/ui/spinner";

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
      title="Sua meta está criada"
      description="Sua reserva começa agora. Acompanhe o progresso no início."
      primary={{ label: "Ir para o início", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <div className="flex justify-center py-6"><Spinner size={24} /></div>
      ) : first ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="font-semibold">{first.goal.title}</p>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Progresso: {first.progress.pct}%
          </p>
          <p className="mt-3 text-[0.75rem] text-[color:var(--text-muted)]">
            {first.etaLocked
              ? "No Pro: a previsão de quando você conclui."
              : first.progress.etaMonths !== null
                ? `No ritmo atual, cerca de ${first.progress.etaMonths} meses para concluir.`
                : "Acompanhe o progresso no início."}
          </p>
          {first.goal.type === "emergency_fund" && first.goal.monthlyCostCents === null && (
            <p className="mt-2 text-[0.75rem] text-[color:var(--text-muted)]">
              Estimamos seu custo de vida em ~75% da sua renda para dimensionar a reserva. Você ajusta isso depois.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--text-secondary)]">Sua meta foi criada. Veja no início.</p>
      )}
    </WizardShell>
  );
}
