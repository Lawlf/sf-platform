"use client";

import { useEffect, useState } from "react";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { fetchDebts, type DebtListItemPayload } from "@/app/(app)/app/_actions/debt-queries";
import { fetchIncomes } from "@/app/(app)/app/_actions/income-queries";
import { Spinner } from "@/app/components/ui/spinner";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Renda mensal recorrente: o onboarding sempre grava "monthly"; normalizamos weekly
// por garantia e ignoramos one_off (não é renda recorrente do mês).
function monthlyIncomeCents(incomes: Awaited<ReturnType<typeof fetchIncomes>>): bigint {
  return incomes
    .filter((i) => i.isActive)
    .reduce((acc, i) => {
      const c = BigInt(i.amount.cents);
      if (i.frequency === "monthly") return acc + c;
      if (i.frequency === "weekly") return acc + (c * 52n) / 12n;
      return acc;
    }, 0n);
}

// Sem as taxas (tiradas do onboarding por confusão), não dá pra ranquear por custo.
// O cartão de rotativo é, na esmagadora maioria, o juro mais caro, então é a aposta
// honesta para "ataque nº1". A cláusula condicional na copy assume esse limite.
function primaryDebt(debts: DebtListItemPayload[]): DebtListItemPayload | undefined {
  const card = debts.find((d) => d.kind === "credit_card");
  if (card) return card;
  return [...debts].sort(
    (a, b) => Number(BigInt(b.currentBalance.cents) - BigInt(a.currentBalance.cents)),
  )[0];
}

export function ResultPrescription({
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
  const [debts, setDebts] = useState<DebtListItemPayload[]>([]);
  const [incomeCents, setIncomeCents] = useState(0n);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchDebts({ status: "active" }), fetchIncomes()])
      .then(([d, inc]) => {
        if (!active) return;
        setDebts(d);
        setIncomeCents(monthlyIncomeCents(inc));
        setLoaded(true);
      })
      .catch((e) => {
        // Sem catch o loaded nunca virava true e o spinner ficava infinito.
        console.error("carregar prescrição falhou", e);
        if (active) {
          setError(true);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const totalDebtCents = debts.reduce((acc, d) => acc + BigInt(d.currentBalance.cents), 0n);
  const primary = primaryDebt(debts);
  const ratio = incomeCents > 0n ? Number(totalDebtCents) / Number(incomeCents) : null;
  const heavy = ratio !== null && ratio >= 3;

  // "Equivalente a": abaixo de 1 mês mostramos %, a partir de 1 mês mostramos meses.
  const burdenText =
    ratio === null
      ? null
      : ratio < 1
        ? `equivale a ${Math.round(ratio * 100)}% da sua renda do mês`
        : `equivale a ${ratio.toFixed(1).replace(".", ",")} meses da sua renda`;

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="Por onde começar"
      description="Com o que você cadastrou, já dá pra apontar o primeiro alvo."
      onBack={onBack}
      primary={{ label: "Ir para o início", onClick: onFinish, loading: finishing }}
    >
      {!loaded ? (
        <div className="flex justify-center py-6">
          <Spinner size={24} />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Não consegui montar seu plano agora. Vá para o início e veja por lá.
          </p>
        </div>
      ) : debts.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          <p className="font-semibold">Ainda falta cadastrar sua dívida.</p>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
            Quando você cadastrar uma dívida, a gente mostra por onde começar.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              O que você deve hoje
            </p>
            <p
              className={`mt-1 text-[2rem] font-extrabold leading-none ${
                heavy ? "text-[color:var(--semantic-negative)]" : "text-[color:var(--text-primary)]"
              }`}
            >
              {brl.format(Number(totalDebtCents) / 100)}
            </p>
            {burdenText ? (
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{burdenText}.</p>
            ) : null}
          </div>

          {primary ? (
            <div className="rounded-2xl border border-[color:var(--color-brand-500)] bg-[color:var(--surface-2)] p-4">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--color-brand-800)]">
                Ataque primeiro
              </p>
              <p className="mt-1 text-lg font-bold text-[color:var(--text-primary)]">
                {primary.label}
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                {primary.kind === "credit_card"
                  ? "O rotativo do cartão costuma ser o juro mais caro, então é o palpite mais seguro pra começar."
                  : "É a sua maior dívida hoje, um bom ponto de partida."}
              </p>
              <p className="mt-2 text-[0.75rem] text-[color:var(--text-muted)]">
                Quando você anotar a taxa de juros das suas dívidas, a home confirma qual custa mais
                e ajusta a ordem se precisar.
              </p>
            </div>
          ) : null}

          <p className="text-[0.75rem] text-[color:var(--text-muted)]">
            No Pro: o plano completo, quanto você economiza e em quantos meses a dívida zera no ritmo atual.
          </p>
        </div>
      )}
    </WizardShell>
  );
}
