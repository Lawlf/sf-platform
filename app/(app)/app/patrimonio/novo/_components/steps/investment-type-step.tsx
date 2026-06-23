"use client";

import { Controller } from "react-hook-form";

import { WizardField } from "../../../../dividas/nova/_components/wizard-field";
import { WizardRadioCard } from "../../../../dividas/nova/_components/wizard-radio-card";
import { WizardShell, type WizardStep } from "../../../../dividas/nova/_components/wizard-shell";
import type { AssetWizardForm, InvestmentType } from "../asset-wizard.client";

const INVESTMENT_TYPE_OPTIONS: { id: InvestmentType; title: string; description: string }[] = [
  { id: "fixed_income", title: "Renda fixa", description: "Você empresta e recebe juros: Tesouro, CDB, LCI." },
  { id: "crypto", title: "Cripto", description: "Bitcoin, ether e outras moedas digitais." },
  { id: "stocks", title: "Ações", description: "Pedaços de empresas na bolsa." },
  { id: "fund", title: "Fundo", description: "Fundos imobiliários (FIIs) e outros." },
  { id: "other", title: "Não sei o tipo", description: "Só sei quanto tenho. A gente guarda só o valor." },
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
      description="Escolha o que mais combina. Se não souber, toque em Não sei o tipo."
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
