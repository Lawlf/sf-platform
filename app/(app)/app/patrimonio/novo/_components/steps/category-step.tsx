"use client";

import { Car, House, Package, PiggyBank, TrendingUp } from "lucide-react";
import { Controller } from "react-hook-form";

import { WizardField } from "../../../../dividas/nova/_components/wizard-field";
import { WizardRadioCard } from "../../../../dividas/nova/_components/wizard-radio-card";
import { WizardShell, type WizardStep } from "../../../../dividas/nova/_components/wizard-shell";
import type { AssetWizardForm, Category } from "../asset-wizard.client";

const cardIcon = (Icon: typeof Car) => <Icon size={18} strokeWidth={2} aria-hidden />;

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
      title="O que você quer adicionar?"
      description="Escolha o que mais combina com o que você tem."
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
            <WizardField label="O que é">
              <div className="grid grid-cols-2 gap-2">
                <WizardRadioCard
                  icon={cardIcon(Car)}
                  title="Veículo"
                  description="Carro, moto..."
                  active={field.value === "vehicle"}
                  onSelect={() => pick("vehicle")}
                />
                <WizardRadioCard
                  icon={cardIcon(House)}
                  title="Imóvel"
                  description="Casa, apto..."
                  active={field.value === "real_estate"}
                  onSelect={() => pick("real_estate")}
                />
                <WizardRadioCard
                  icon={cardIcon(TrendingUp)}
                  title="Investimento"
                  description="Ações, fundo, renda fixa, cripto."
                  active={field.value === "investment"}
                  onSelect={() => pick("investment")}
                />
                <WizardRadioCard
                  icon={cardIcon(PiggyBank)}
                  title="Dinheiro em conta"
                  description="Conta, poupança, reserva."
                  active={field.value === "cash"}
                  onSelect={() => pick("cash")}
                />
                <WizardRadioCard
                  icon={cardIcon(Package)}
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
