"use client";

import { ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setAcquisitionChannelAction } from "@/app/(app)/app/_actions/onboarding";
import { WizardShell, type WizardStep } from "@/app/(app)/app/_components/wizard-shell";
import type { AcquisitionChannel } from "@/domain/entities/user.entity";

const GROUPS: {
  eyebrow: string;
  options: { value: AcquisitionChannel; label: string }[];
}[] = [
  {
    eyebrow: "Indicação",
    options: [
      { value: "friend_referral", label: "Indicação de amigo" },
      { value: "influencer", label: "Alguém que sigo indicou" },
      { value: "founder_direct", label: "Falei com quem criou" },
      { value: "messaging_group", label: "Grupo de WhatsApp/Telegram" },
    ],
  },
  {
    eyebrow: "Redes sociais",
    options: [
      { value: "instagram", label: "Instagram" },
      { value: "tiktok", label: "TikTok" },
      { value: "youtube", label: "YouTube" },
      { value: "facebook", label: "Facebook" },
    ],
  },
  {
    eyebrow: "Outros",
    options: [
      { value: "google_search", label: "Google" },
      { value: "free_calculator", label: "Usei uma calculadora de vocês" },
      { value: "dont_remember", label: "Não lembro" },
      { value: "other", label: "Outro" },
    ],
  },
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
      title="Última coisa: como você chegou aqui?"
      description="Um toque ajuda a gente a saber o que está dando certo. Em 10 segundos você entra."
      onBack={onBack}
      primary={{
        label: "Entrar no app",
        onClick: confirm,
        disabled: !canSubmit,
        loading: saving || finishing,
        icon: <ArrowRight size={18} />,
      }}
      secondary={{ label: "Pular", onClick: onSkip }}
    >
      <div className="flex flex-col gap-4">
        {GROUPS.map((group) => (
          <div key={group.eyebrow} className="flex flex-col gap-2">
            <span className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)] opacity-55">
              {group.eyebrow}
            </span>
            <div className="flex flex-wrap items-start gap-2">
              {group.options.map(({ value, label }) => {
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
          </div>
        ))}
        {isOther ? (
          <input
            type="text"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={120}
            autoFocus
            placeholder="De onde veio? Pode ser bem rápido"
            className="mt-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-sm"
          />
        ) : null}
      </div>
    </WizardShell>
  );
}
