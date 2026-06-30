"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { fetchNetWorth } from "@/app/(app)/app/_actions/asset-queries";
import { MoneyInput } from "@/app/(app)/app/_components/money-input";
import { WizardShell, type WizardStep } from "@/app/(app)/app/_components/wizard-shell";
import { createAssetAction } from "@/app/(app)/app/patrimonio/novo/_actions/create-asset.action";

import {
  formatCents,
  ResultHintCard,
  ResultPreviewHint,
  ResultPreviewLoading,
  ResultStatCard,
} from "./result-preview.client";

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";
const labelClass =
  "mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80";

const schema = z.object({
  label: z.string().min(1, "Informe um nome."),
  currentValueCents: z.bigint().positive("Informe um valor válido."),
});
type FormValues = z.infer<typeof schema>;

export function AssetStep({
  stepNumber,
  totalSteps,
  onDone,
  onBack,
  onSkip,
}: {
  stepNumber: WizardStep;
  totalSteps: number;
  onDone: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [saving, startSaving] = useTransition();
  // Patrimônio já existente antes deste bem (em onboarding novo costuma ser 0n).
  const [baseline, setBaseline] = useState<{ netCents: bigint; assetsCents: bigint } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: "Reserva / conta", currentValueCents: 0n as unknown as bigint },
  });

  useEffect(() => {
    let active = true;
    fetchNetWorth()
      .then((s) => {
        if (!active) return;
        setBaseline({
          netCents: s ? BigInt(s.netWorth.cents) : 0n,
          assetsCents: s ? BigInt(s.totalAssets.cents) : 0n,
        });
      })
      .catch((e) => {
        console.error("fetchNetWorth (onboarding) falhou", e);
        if (active) setBaseline({ netCents: 0n, assetsCents: 0n });
      });
    return () => {
      active = false;
    };
  }, []);

  function onSubmit(values: FormValues) {
    startSaving(async () => {
      const res = await createAssetAction({
        category: "cash",
        label: values.label.trim(),
        currentValueCents: values.currentValueCents.toString(),
        metadataJson: null,
        acquiredAt: null,
        allocations: [],
        depreciationKind: "stable",
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      onDone();
    });
  }

  const typed = form.watch("currentValueCents");
  const typedCents = typeof typed === "bigint" ? typed : 0n;

  return (
    <WizardShell
      currentStep={stepNumber}
      totalSteps={totalSteps}
      title="O que você já tem"
      description="Seu dinheiro guardado ou um bem. Só um item já monta seu resumo, aqui embaixo."
      onBack={onBack}
      primary={{ label: "Continuar", onClick: form.handleSubmit(onSubmit), loading: saving }}
      secondary={{ label: "Pular esta etapa", onClick: onSkip }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="onb-asset-label">
            Nome
          </label>
          <input id="onb-asset-label" {...form.register("label")} className={fieldClass} />
          {form.formState.errors.label ? (
            <span role="alert" className="mt-1 text-[0.6875rem] text-[color:var(--semantic-negative)]">
              {form.formState.errors.label.message}
            </span>
          ) : null}
        </div>

        <MoneyInput control={form.control} name="currentValueCents" label="Valor atual" required />
      </div>

      <div className="mt-1 flex flex-col gap-3">
        <AssetPreview baseline={baseline} typedCents={typedCents} />
      </div>
    </WizardShell>
  );
}

function AssetPreview({
  baseline,
  typedCents,
}: {
  baseline: { netCents: bigint; assetsCents: bigint } | null;
  typedCents: bigint;
}) {
  if (baseline === null) {
    return <ResultPreviewLoading />;
  }
  if (typedCents <= 0n) {
    return <ResultPreviewHint>Digite o valor pra ver seu resumo.</ResultPreviewHint>;
  }

  const net = baseline.netCents + typedCents;
  const assets = baseline.assetsCents + typedCents;

  return (
    <>
      <ResultStatCard
        eyebrow="Quanto é seu hoje"
        value={formatCents(net)}
        caption={`O que você tem: ${formatCents(assets)}`}
      />
      <ResultHintCard eyebrow="Seu próximo passo">
        Dinheiro parado rende pouco. No início, em Simular, dá pra ver quanto ele renderia ao longo do
        tempo.
      </ResultHintCard>
    </>
  );
}
