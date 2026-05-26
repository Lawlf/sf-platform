"use client";

import { useMoneyVisibility } from "./money-visibility-provider.client";

/** Wraps a monetary value; blurs it (keeping layout) when the user hid values. */
export function HideableValue({ children }: { children: React.ReactNode }) {
  const { hidden } = useMoneyVisibility();
  if (!hidden) return <>{children}</>;
  return (
    <span className="select-none blur-sm" aria-label="valor oculto" title="valor oculto">
      {children}
    </span>
  );
}
