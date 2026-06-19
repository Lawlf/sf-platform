import { Users } from "lucide-react";

export function HouseholdJointEmpty() {
  return (
    <section
      aria-label="Visão conjunta da casa"
      className="flex flex-col items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-6 py-8 text-center backdrop-blur-xl"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
        <Users size={22} strokeWidth={1.75} aria-hidden />
      </span>
      <div>
        <div className="text-[1rem] font-bold text-[color:var(--text-primary)]">
          Comece compartilhando um perfil
        </div>
        <div className="mt-1 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          Escolha acima o que você inclui no lar. Quando houver o que somar, a visão de vocês aparece
          aqui.
        </div>
      </div>
    </section>
  );
}
