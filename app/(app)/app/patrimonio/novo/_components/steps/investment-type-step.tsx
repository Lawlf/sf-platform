"use client";

import { Controller } from "react-hook-form";

import { WizardField } from "../../../../dividas/nova/_components/wizard-field";
import { WizardRadioCard } from "../../../../dividas/nova/_components/wizard-radio-card";
import { WizardShell, type WizardStep } from "../../../../dividas/nova/_components/wizard-shell";
import type { AssetWizardForm, InvestmentType } from "../asset-wizard.client";

const INVESTMENT_TYPE_OPTIONS: { id: InvestmentType; title: string; description: string }[] = [
  { id: "stocks", title: "Ações", description: "B3, ticker, quantidade." },
  { id: "fund", title: "Fundo", description: "FIIs, FIA, fundos de investimento." },
  { id: "fixed_income", title: "Renda fixa", description: "Tesouro, CDB, LCI/LCA." },
  { id: "crypto", title: "Cripto", description: "BTC, ETH, stablecoins." },
  { id: "other", title: "Outro", description: "Qualquer outro investimento." },
];

export interface InvestmentTypeStepProps {
  form: AssetWizardForm;
  visualStep: WizardStep;
  onBack: () => void;
  onNext: () => void;
  totalSteps?: number;
}

export function InvestmentTypeStep({
  form,
  visualStep,
  onBack,
  onNext,
  totalSteps,
}: InvestmentTypeStepProps) {
  return (
    <WizardShell
      currentStep={visualStep}
      title="Tipo de investimento"
      description="Escolha o tipo mais próximo. Os campos do próximo passo são específicos para cada tipo."
      onBack={onBack}
      totalSteps={totalSteps}
    >
      <Controller
        control={form.control}
        name="investmentType"
        render={({ field }) => {
          const pick = (value: InvestmentType) => {
            field.onChange(value);
            onNext();
          };
          return (
            <WizardField label="Tipo">
              <div className="grid grid-cols-2 gap-2">
                {INVESTMENT_TYPE_OPTIONS.map((opt) => (
                  <WizardRadioCard
                    key={opt.id}
                    title={opt.title}
                    description={opt.description}
                    active={field.value === opt.id}
                    onSelect={() => pick(opt.id)}
                  />
                ))}
              </div>
            </WizardField>
          );
        }}
      />
    </WizardShell>
  );
}
