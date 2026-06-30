"use client";

import { useId } from "react";
import { type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { WizardField, wizardInputClass } from "@/ui/wizard-field";
import { WizardMoneyField } from "@/ui/wizard-money-field";
import type { NewPurchaseFormValues } from "../new-purchase-wizard.client";

export interface WhatStepProps {
  control: Control<NewPurchaseFormValues>;
  register: UseFormRegister<NewPurchaseFormValues>;
  errors: FieldErrors<NewPurchaseFormValues>;
}

export function WhatStep({ control, register, errors }: WhatStepProps) {
  const nameId = useId();
  const valueId = useId();

  return (
    <>
      <WizardField label="Nome da compra" htmlFor={nameId} error={errors.name?.message}>
        <input
          id={nameId}
          {...register("name")}
          placeholder="iPhone 13 Pro Max"
          className={wizardInputClass}
        />
      </WizardField>

      <WizardField label="Quanto custou" htmlFor={valueId} error={errors.valueCents?.message}>
        <WizardMoneyField control={control} name="valueCents" id={valueId} placeholder="R$ 0,00" />
      </WizardField>
    </>
  );
}
