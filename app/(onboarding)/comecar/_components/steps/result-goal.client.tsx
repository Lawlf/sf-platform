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
  onBack,
  finishing,
}: {
  stepNumber: WizardStep;
  totalSteps: number;
  onFinish: () => void;
  onBack: () => void;
  finishing: boolean;
}) {
  const [goals, setGoals] = useState<Goals>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchGoalsWithProgress()
      .then((g) => {
        if (active) {
          setGoals(g);
          setLoaded(true);
        }
      })
      .catch((e) => {
        // Sem catch o loaded nunca virava true e o spinner ficava infinito.
        console.error("fetchGoalsWithProgress falhou", e);
        if (active) {
          setError(true);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const first = goals[0];
  const skipped = loaded && !error && !first;

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title={error ? "Sua reserva de emergência" : skipped ? "Você pulou a meta" : "Sua meta está criada"}
      description={
        error
          ? "Acompanhe sua reserva no início."
          : skipped
            ? "Sem problema. Você cria sua reserva quando quiser, no início."
            : "Sua reserva começa agora. Acompanhe o progresso no início."
      }
      onBack={onBack}
      primary={{ label: "Ir para o início", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <div className="flex justify-center py-6"><Spinner size={24} /></div>
      ) : error ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Não consegui carregar sua meta agora. Vá para o início e veja por lá.
          </p>
        </div>
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
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Nenhuma meta criada ainda. Quando quiser, monte sua reserva de emergência no início.
          </p>
        </div>
      )}
    </WizardShell>
  );
}
