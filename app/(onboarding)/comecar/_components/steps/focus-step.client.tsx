"use client";

import { useState, useTransition } from "react";
import { ArrowRight, PiggyBank, TrendingUp, Wallet } from "lucide-react";

import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import { setOnboardingFocusAction } from "@/app/(app)/app/_actions/onboarding";
import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";

const OPTIONS: { value: ContentDiagnosticAnswer; title: string; sub: string; Icon: typeof Wallet }[] = [
  { value: "pagar-divida", title: "Estou afogado em dívidas", sub: "Quero saber qual quitar primeiro.", Icon: Wallet },
  { value: "guardar", title: "Quero me organizar e guardar", sub: "Montar minha reserva com um alvo.", Icon: PiggyBank },
  { value: "investir", title: "Quero crescer meu patrimônio", sub: "Ver minha foto financeira completa.", Icon: TrendingUp },
];

export function FocusStep({
  initialFocus,
  stepNumber,
  totalSteps,
  onChosen,
  onSkipAll,
  finishing,
}: {
  initialFocus: ContentDiagnosticAnswer | null;
  stepNumber: WizardStep;
  totalSteps: number;
  onChosen: (focus: ContentDiagnosticAnswer) => void;
  onSkipAll: () => void;
  finishing: boolean;
}) {
  const [selected, setSelected] = useState<ContentDiagnosticAnswer | null>(initialFocus);
  const [saving, startSaving] = useTransition();

  function confirm() {
    if (selected === null) return;
    const chosen = selected;
    startSaving(async () => {
      await setOnboardingFocusAction(chosen);
      onChosen(chosen);
    });
  }

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="Por onde começamos?"
      description="Escolha o que mais pesa agora. Dá para mudar depois."
      primary={{
        label: "Continuar",
        onClick: confirm,
        disabled: selected === null,
        loading: saving,
        icon: <ArrowRight size={18} />,
      }}
      secondary={{ label: "Pular por agora", onClick: onSkipAll }}
    >
      <div className="flex flex-col gap-3">
        {OPTIONS.map(({ value, title, sub, Icon }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              aria-pressed={active}
              disabled={finishing}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[color:var(--color-brand-500)] bg-[color:var(--surface-2)]"
                  : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
              }`}
            >
              <Icon size={22} strokeWidth={1.5} aria-hidden className="shrink-0 opacity-80" />
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="block text-sm opacity-70">{sub}</span>
              </span>
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
