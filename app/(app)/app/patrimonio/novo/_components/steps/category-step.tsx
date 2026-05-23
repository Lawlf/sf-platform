"use client";

import { Controller } from "react-hook-form";

import { WizardField } from "../../../../dividas/nova/_components/wizard-field";
import { WizardRadioCard } from "../../../../dividas/nova/_components/wizard-radio-card";
import { WizardShell, type WizardStep } from "../../../../dividas/nova/_components/wizard-shell";
import type { AssetWizardForm, Category } from "../asset-wizard.client";

export interface CategoryStepProps {
  form: AssetWizardForm;
  visualStep: WizardStep;
  onBack: () => void;
  onNext: () => void;
  totalSteps?: number;
}

export function CategoryStep({ form, visualStep, onBack, onNext, totalSteps }: CategoryStepProps) {
  return (
    <WizardShell
      currentStep={visualStep}
      title="Qual categoria do ativo?"
      description="Cada categoria mostra campos diferentes. Escolha a mais próxima."
      onBack={onBack}
      totalSteps={totalSteps}
    >
      <Controller
        control={form.control}
        name="category"
        render={({ field }) => {
          const pick = (value: Category) => {
            field.onChange(value);
            onNext();
          };
          return (
            <WizardField label="Categoria">
              <div className="grid grid-cols-2 gap-2">
                <WizardRadioCard
                  title="Veículo"
                  description="Carro, moto..."
                  active={field.value === "vehicle"}
                  onSelect={() => pick("vehicle")}
                />
                <WizardRadioCard
                  title="Imóvel"
                  description="Casa, apto..."
                  active={field.value === "real_estate"}
                  onSelect={() => pick("real_estate")}
                />
                <WizardRadioCard
                  title="Investimento"
                  description="Ações, fundo, RF..."
                  active={field.value === "investment"}
                  onSelect={() => pick("investment")}
                />
                <WizardRadioCard
                  title="Reserva / Conta"
                  description="Dinheiro em conta, poupança, reserva."
                  active={field.value === "cash"}
                  onSelect={() => pick("cash")}
                />
                <WizardRadioCard
                  title="Outro"
                  description="Qualquer bem"
                  active={field.value === "other"}
                  onSelect={() => pick("other")}
                />
              </div>
            </WizardField>
          );
        }}
      />
    </WizardShell>
  );
}
