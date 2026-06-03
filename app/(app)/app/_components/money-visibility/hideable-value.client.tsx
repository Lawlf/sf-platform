"use client";

import { useMoneyVisibility } from "./money-visibility-provider.client";

export function HideableValue({ children }: { children: React.ReactNode }) {
  const { hidden } = useMoneyVisibility();
  if (!hidden) return <>{children}</>;
  return (
    <span
      className="inline-flex select-none items-center gap-[0.28em] align-baseline"
      aria-label="valor oculto"
      title="valor oculto"
    >
      <span aria-hidden>R$</span>
      <span className="inline-flex items-center gap-[0.18em]">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="inline-block size-[0.5em] rounded-full bg-current opacity-80"
          />
        ))}
      </span>
    </span>
  );
}
