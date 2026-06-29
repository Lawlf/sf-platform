"use client";

import { useId } from "react";

interface SimSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}

// Trilho com cor visível em ambos os temas (--border-strong) + thumb da marca.
// Estiliza os pseudo-elementos explicitamente porque, com appearance-none, o
// WebKit descarta o trilho nativo (e o fundo do input some no tema escuro).
// Classes literais: o JIT do Tailwind escaneia o source estaticamente.
const SLIDER_CLASS =
  "focus-ring w-full cursor-pointer appearance-none rounded-full bg-transparent " +
  "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[color:var(--border-strong)] " +
  "[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[color:var(--color-brand-500)] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.3)] " +
  "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[color:var(--border-strong)] " +
  "[&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[color:var(--color-brand-500)] " +
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[color:var(--color-brand-500)] [&::-moz-range-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.3)]";

export function SimSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: SimSliderProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
        >
          {label}
        </label>
        <span className="text-[0.75rem] font-bold text-[color:var(--color-brand-800)]">
          {displayValue}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={displayValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={SLIDER_CLASS}
      />
    </div>
  );
}
