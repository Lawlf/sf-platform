"use client";

export interface WizardRadioCardProps {
  title: string;
  description: string;
  active: boolean;
  onSelect: () => void;
}

export function WizardRadioCard({ title, description, active, onSelect }: WizardRadioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`rounded-xl border-[1.5px] p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
        active
          ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/12"
          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-2)]"
      }`}
    >
      <div className="text-[13px] font-bold text-[color:var(--text-primary)]">{title}</div>
      <div className="mt-0.5 text-[10px] text-[color:var(--text-primary)] opacity-65">
        {description}
      </div>
    </button>
  );
}
