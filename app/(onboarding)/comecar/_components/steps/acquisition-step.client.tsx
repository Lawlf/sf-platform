"use client";

import { ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setAcquisitionChannelAction } from "@/app/(app)/app/_actions/onboarding";
import { WizardShell, type WizardStep } from "@/app/(app)/app/dividas/nova/_components/wizard-shell";
import type { AcquisitionChannel } from "@/domain/entities/user.entity";

const GROUPS: { value: AcquisitionChannel; label: string }[][] = [
  [
    { value: "founder_direct", label: "Falei com quem criou" },
    { value: "friend_referral", label: "Indicação de amigo" },
    { value: "messaging_group", label: "Grupo de WhatsApp/Telegram" },
    { value: "influencer", label: "Influenciador" },
  ],
  [
    { value: "instagram", label: "Instagram" },
    { value: "tiktok", label: "TikTok" },
    { value: "youtube", label: "YouTube" },
    { value: "facebook", label: "Facebook" },
  ],
  [
    { value: "free_calculator", label: "Calculadora grátis" },
    { value: "google_search", label: "Google" },
    { value: "other", label: "Outro" },
  ],
];

export function AcquisitionStep({
  stepNumber,
  totalSteps,
  onDone,
  onBack,
  onSkip,
  finishing,
}: {
  stepNumber: WizardStep;
  totalSteps: number;
  onDone: () => void;
  onBack: () => void;
  onSkip: () => void;
  finishing: boolean;
}) {
  const [selected, setSelected] = useState<AcquisitionChannel | null>(null);
  const [detail, setDetail] = useState("");
  const [saving, startSaving] = useTransition();

  const isOther = selected === "other";
  const canSubmit = selected !== null && (!isOther || detail.trim().length > 0);

  function confirm() {
    if (selected === null) return;
    const channel = selected;
    startSaving(async () => {
      const res = await setAcquisitionChannelAction(
        channel === "other" ? { channel, detail: detail.trim() } : { channel },
      );
      if (!res.ok) {
        toast.error(res.message ?? "Não foi possível salvar agora.");
        return;
      }
      onDone();
    });
  }

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="Pergunta rápida, é pra gente"
      description="Como você chegou no Sabor? Ajuda a gente a saber o que está funcionando. Um toque e pronto."
      onBack={onBack}
      primary={{
        label: "Concluir",
        onClick: confirm,
        disabled: !canSubmit,
        loading: saving || finishing,
        icon: <ArrowRight size={18} />,
      }}
      secondary={{ label: "Pular", onClick: onSkip }}
    >
      <div className="flex flex-col gap-3">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-wrap gap-2">
            {group.map(({ value, label }) => {
              const active = selected === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(value)}
                  disabled={finishing || saving}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-[color:var(--color-brand-500)] bg-[color:var(--surface-2)] font-semibold"
                      : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ))}
        {isOther ? (
          <input
            type="text"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={120}
            autoFocus
            placeholder="Me conta como você chegou (seu contador, ouvi falar, ou não lembro direito)"
            className="mt-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-sm"
          />
        ) : null}
      </div>
    </WizardShell>
  );
}
