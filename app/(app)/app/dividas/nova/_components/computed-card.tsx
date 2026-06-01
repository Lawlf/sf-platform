import type { ReactNode } from "react";

export interface ComputedCardProps {
  label: string;
  value: ReactNode;
  sub?: string | undefined;
}

export function ComputedCard({ label, value, sub }: ComputedCardProps) {
  return (
    <section
      className="mb-[14px] rounded-2xl p-4 text-white"
      style={{
        background: "linear-gradient(135deg, #ef7a1a, #f28e25)",
        boxShadow: "0 8px 24px rgba(239,122,26,0.3)",
      }}
      aria-live="polite"
    >
      <div className="text-[0.625rem] font-semibold uppercase tracking-[0.6px] opacity-90">{label}</div>
      <div className="mt-1 text-[1.625rem] font-extrabold leading-tight">{value}</div>
      {sub ? <div className="mt-0.5 text-[0.6875rem] opacity-85">{sub}</div> : null}
    </section>
  );
}
