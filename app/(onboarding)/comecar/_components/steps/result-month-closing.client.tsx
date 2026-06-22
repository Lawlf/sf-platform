"use client";

import { useEffect, useState } from "react";

import { fetchDashboardSnapshot, type DashboardSnapshotPayload } from "@/app/(app)/app/_actions/dashboard-queries";
import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { Spinner } from "@/app/components/ui/spinner";

const CURRENT_MONTH_NAME = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());

export function ResultMonthClosing({
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
  const [snap, setSnap] = useState<DashboardSnapshotPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchDashboardSnapshot()
      .then((s) => {
        if (active) {
          setSnap(s);
          setLoaded(true);
        }
      })
      .catch((e) => {
        console.error("fetchDashboardSnapshot falhou", e);
        if (active) {
          setError(true);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const noIncome = snap != null && BigInt(snap.totalIncome.cents) === 0n;
  const freeCents = snap != null ? BigInt(snap.monthlyFreeCashFlow.cents) : 0n;
  const positive = freeCents >= 0n;
  const absFormatted = snap != null ? snap.monthlyFreeCashFlow.formatted.replace("-", "").trim() : "";

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title={
        error || noIncome
          ? "Falta sua renda"
          : positive
            ? "Por enquanto, sobra"
            : "Por enquanto, aperta"
      }
      description={
        error
          ? "Não consegui calcular agora. Veja no início."
          : noIncome
            ? "Sem a renda não dá pra saber se o mês fecha. Cadastre no início."
            : "Com sua renda e suas contas, é assim que o mês termina."
      }
      onBack={onBack}
      primary={{ label: "Ir para o início", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <div className="flex justify-center py-6"><Spinner size={24} /></div>
      ) : error || noIncome || snap == null ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm text-[color:var(--text-secondary)]">
            {error
              ? "Não consegui carregar agora. Vá para o início e veja por lá."
              : "Cadastre sua renda no início pra ver se o mês fecha."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            {positive ? "Sobra no fim do mês" : "Falta no fim do mês"}
          </p>
          <p
            className={`mt-1 text-[2rem] font-extrabold leading-none ${
              positive ? "text-[color:var(--text-primary)]" : "text-[color:var(--semantic-negative)]"
            }`}
          >
            {absFormatted}
          </p>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            {positive
              ? `Com o que você cadastrou, sobraria isso no fim de ${CURRENT_MONTH_NAME}.`
              : `Com o que você cadastrou, faltaria isso pra fechar ${CURRENT_MONTH_NAME}.`}
          </p>
          <p className="mt-3 text-[0.75rem] text-[color:var(--text-muted)]">
            É uma conta parcial. Quanto mais conta e dívida você somar no início, mais real fica.
          </p>
        </div>
      )}

      {loaded && !error && !noIncome && snap != null ? (
        <div className="mt-3 rounded-2xl border border-[color:var(--color-brand-500)] bg-[color:var(--surface-2)] p-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--color-brand-800)]">
            Seu próximo passo
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-primary)]">
            {positive
              ? "Antes de gastar, separe parte dessa sobra. No mês fraco é ela que segura."
              : "Some suas dívidas e contas no início pra ver o tamanho real e onde dá pra cortar."}
          </p>
        </div>
      ) : null}
    </WizardShell>
  );
}
