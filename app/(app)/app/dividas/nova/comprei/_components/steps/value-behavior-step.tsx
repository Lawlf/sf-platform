"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { type ReactNode, useId } from "react";
import { type Control, Controller, type FieldErrors, type Path } from "react-hook-form";

import { WizardField, wizardInputClass } from "../../../_components/wizard-field";
import type { NewPurchaseFormValues, ValueBehavior } from "../new-purchase-wizard.client";

interface BehaviorOption {
  id: ValueBehavior;
  title: string;
  description: string;
  icon: ReactNode;
  hasRate: boolean;
  rateLabel?: string;
}

const BEHAVIORS: readonly BehaviorOption[] = [
  {
    id: "depreciating",
    title: "Perde valor",
    description: "Eletrônicos, móveis e carros normalmente perdem valor.",
    icon: <TrendingDown size={20} strokeWidth={1.75} aria-hidden />,
    hasRate: true,
    rateLabel: "Quanto perde por ano?",
  },
  {
    id: "appreciating",
    title: "Ganha valor",
    description: "Imóveis, colecionáveis, obras de arte.",
    icon: <TrendingUp size={20} strokeWidth={1.75} aria-hidden />,
    hasRate: true,
    rateLabel: "Quanto ganha por ano?",
  },
  {
    id: "stable",
    title: "Mantém o valor",
    description: "Não perde nem ganha (ouro, alguns ativos).",
    icon: <Minus size={20} strokeWidth={1.75} aria-hidden />,
    hasRate: false,
  },
] as const;

// Card de comportamento de valor. Diferente do KindCard, NÃO auto-avança no
// click, porque o usuário ainda precisa preencher a taxa quando aplicável.
function BehaviorCard({
  icon,
  title,
  description,
  selected,
  onSelect,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-[14px] border-[1.5px] backdrop-blur-[16px] transition-colors duration-200 ${
        selected
          ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/10"
          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex w-full items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)]"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 ${
            selected
              ? "bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white"
              : "bg-[rgba(242,142,37,0.14)] text-[color:var(--color-brand-800)]"
          }`}
        >
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            {title}
          </span>
          <span className="mt-0.5 block text-[0.6875rem] leading-[1.3] text-[color:var(--text-primary)] opacity-65">
            {description}
          </span>
        </span>
      </button>
      {selected && children ? (
        <div className="border-t border-[color:var(--border-soft)] px-3 pb-3 pt-2">{children}</div>
      ) : null}
    </div>
  );
}

export interface ValueBehaviorStepProps {
  control: Control<NewPurchaseFormValues>;
  errors: FieldErrors<NewPurchaseFormValues>;
  selected: ValueBehavior | null;
  onSelectBehavior: (b: ValueBehavior) => void;
}

export function ValueBehaviorStep({
  control,
  errors,
  selected,
  onSelectBehavior,
}: ValueBehaviorStepProps) {
  const rateId = useId();
  return (
    <div role="radiogroup" aria-label="Comportamento do valor" className="flex flex-col gap-2">
      {BEHAVIORS.map((b) => (
        <BehaviorCard
          key={b.id}
          icon={b.icon}
          title={b.title}
          description={b.description}
          selected={selected === b.id}
          onSelect={() => onSelectBehavior(b.id)}
        >
          {b.hasRate && b.rateLabel ? (
            <WizardField label={b.rateLabel} htmlFor={rateId} error={errors.annualRatePct?.message}>
              <Controller
                control={control}
                name={"annualRatePct" as Path<NewPurchaseFormValues>}
                render={({ field }) => (
                  <div className="relative">
                    <input
                      id={rateId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={0.5}
                      value={
                        field.value === null || field.value === undefined
                          ? ""
                          : String(field.value as number)
                      }
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : Number(e.target.value))
                      }
                      onBlur={field.onBlur}
                      className={`${wizardInputClass} pr-16`}
                      aria-required
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.75rem] font-semibold text-[color:var(--text-muted)]">
                      %/ano
                    </span>
                  </div>
                )}
              />
            </WizardField>
          ) : null}
        </BehaviorCard>
      ))}
    </div>
  );
}
