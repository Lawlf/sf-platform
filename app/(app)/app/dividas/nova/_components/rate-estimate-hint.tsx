"use client";

import { useState } from "react";
import { type Control, type FieldValues, type Path, useController } from "react-hook-form";

import type { RateEstimate } from "../_lib/debt-rate-estimates";

interface RateEstimateHintProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  estimate: RateEstimate;
}

export function RateEstimateHint<T extends FieldValues>({
  control,
  name,
  estimate,
}: RateEstimateHintProps<T>) {
  const { field } = useController({ control, name });
  const [applied, setApplied] = useState(false);

  function applyEstimate() {
    field.onChange(estimate.valuePct);
    setApplied(true);
  }

  if (applied) {
    return (
      <p className="mt-1.5 text-[0.75rem] leading-snug text-[color:var(--text-muted)]">
        {estimate.note}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={applyEstimate}
      className="mt-1.5 text-left text-[0.75rem] font-medium text-[color:var(--color-brand-700)] underline underline-offset-2"
    >
      Não sei minha taxa, usar {estimate.label}
    </button>
  );
}
