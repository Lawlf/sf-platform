"use client";

import { useEffect, useState } from "react";

import { fetchNetWorth } from "@/app/(app)/app/_actions/asset-queries";
import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { Spinner } from "@/app/components/ui/spinner";

type Snapshot = Awaited<ReturnType<typeof fetchNetWorth>>;

export function ResultNetWorth({
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
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchNetWorth()
      .then((s) => {
        if (active) {
          setSnap(s);
          setLoaded(true);
        }
      })
      .catch((e) => {
        // Sem catch o loaded nunca virava true e o spinner ficava infinito.
        console.error("fetchNetWorth falhou", e);
        if (active) {
          setError(true);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const empty = loaded && !error && (!snap || snap.totalAssets.cents === "0");

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title={empty ? "Ainda falta seu primeiro bem" : "Quanto você já juntou"}
      description={
        empty
          ? "Sem problema. Cadastre um bem ou sua reserva no início pra montar seu resumo."
          : "Esse é o total que é seu hoje. Ele cresce conforme você cadastra."
      }
      onBack={onBack}
      primary={{ label: "Continuar", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <div className="flex justify-center py-6"><Spinner size={24} /></div>
      ) : error ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Não consegui carregar seu resumo financeiro agora. Vá para o início e veja por lá.
          </p>
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Você ainda não cadastrou nenhum bem. Quando cadastrar, seu resumo financeiro aparece aqui.
          </p>
        </div>
      ) : snap ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Quanto é seu hoje
            </p>
            <p className="mt-1 text-[2rem] font-extrabold leading-none">{snap.netWorth.formatted}</p>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              O que você tem: {snap.totalAssets.formatted}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--color-brand-500)] bg-[color:var(--surface-2)] p-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--color-brand-800)]">
              Seu próximo passo
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-primary)]">
              Dinheiro parado rende pouco. No início, em Simular, dá pra ver quanto ele renderia
              ao longo do tempo.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm text-[color:var(--text-secondary)]">Seu patrimônio está montado. Veja o detalhe no início.</p>
        </div>
      )}
    </WizardShell>
  );
}
