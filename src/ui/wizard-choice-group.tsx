"use client";

import type { JSX, ReactNode } from "react";

import { WizardRadioCard } from "@/ui/wizard-radio-card";

export interface WizardChoiceOption<T extends string> {
  value: T;
  title: string;
  description: string;
  icon?: ReactNode;
}

export interface WizardChoiceGroupProps<T extends string> {
  options: ReadonlyArray<WizardChoiceOption<T>>;
  value: T | null | undefined;
  onChange: (value: T) => void;
  ariaLabel?: string;
  variant?: "primary" | "subtle";
}

export function WizardChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  variant = "subtle",
}: WizardChoiceGroupProps<T>): JSX.Element {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-col gap-2">
      {options.map((opt) => (
        <WizardRadioCard
          key={opt.value}
          title={opt.title}
          description={opt.description}
          icon={opt.icon}
          active={value === opt.value}
          onSelect={() => onChange(opt.value)}
          variant={variant}
          chevron
        />
      ))}
    </div>
  );
}
