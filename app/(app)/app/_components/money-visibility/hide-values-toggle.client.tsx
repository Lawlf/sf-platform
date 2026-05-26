"use client";

import { Eye, EyeOff } from "lucide-react";

import { SimpleTooltip } from "@/app/components/ui/tooltip";

import { useMoneyVisibility } from "./money-visibility-provider.client";

export function HideValuesToggle({ size = 16 }: { size?: number }) {
  const { hidden, toggle } = useMoneyVisibility();
  return (
    <SimpleTooltip label={hidden ? "Mostrar valores" : "Esconder valores"} side="bottom">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={hidden}
        aria-label={hidden ? "Mostrar valores" : "Esconder valores"}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--surface-1)] text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)]"
      >
        {hidden ? (
          <EyeOff size={size} strokeWidth={1.75} aria-hidden />
        ) : (
          <Eye size={size} strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </SimpleTooltip>
  );
}
