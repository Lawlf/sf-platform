import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { RhythmGrid } from "../../_components/rhythm-grid";

export const metadata: Metadata = { title: "Ritmo" };

export default async function ConteudoRitmoPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="mb-2 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-800)]">
          <span
            className="block h-[1.5px] w-3.5 rounded-full"
            style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
          />
          Seu ritmo
        </div>
        <h1 className="font-serif text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[color:var(--text-primary)] md:text-[34px]">
          Sem streak. Sem corrida.
        </h1>
        <p className="mt-2 text-[13px] text-[color:var(--text-secondary)]">
          A gente conta módulo lido e aplicado. Quando você quiser.
        </p>
      </header>

      <RhythmGrid modulesRead={0} />
    </div>
  );
}
