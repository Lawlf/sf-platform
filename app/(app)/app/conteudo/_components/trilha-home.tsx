import type { TrilhaSpec } from "../_lib/trilhas";

import { computeTrilhaProgress } from "../_lib/progress";
import { BookCard } from "./book-card";
import { ModuleRow } from "./module-row";
import { NextModuleHero } from "./next-module-hero";
import { RhythmGrid } from "./rhythm-grid";
import { SfxMuteToggle } from "./sfx-mute-toggle.client";

export interface TrilhaHomeProps {
  trilha: TrilhaSpec;
  completedNums: number[];
  suggestedHere?: boolean;
}

export function TrilhaHome({ trilha, completedNums, suggestedHere }: TrilhaHomeProps) {
  const progress = computeTrilhaProgress(trilha.modules, completedNums);
  const nextModule =
    trilha.modules.find((m) => m.num === progress.nextNum) ?? trilha.modules[0];
  if (!nextModule) {
    throw new Error(`Trilha ${trilha.slug} has no modules`);
  }
  const firstBook = trilha.books[0];

  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-[0.65625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-800)]">
            <span
              className="block h-[1.5px] w-3.5 rounded-full"
              style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
            />
            Sua trilha
          </div>
          <SfxMuteToggle />
        </div>
        <h1 className="font-serif text-[1.875rem] font-bold leading-[1.05] tracking-[-0.025em] text-[color:var(--text-primary)] md:text-[2.625rem]">
          {renderTitleWithEmphasis(trilha.title, trilha.emphasis)}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--border-soft)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress.totalReady === 0 ? 0 : (progress.completedCount / progress.totalReady) * 100}%`,
                background: "linear-gradient(90deg, #f28e25, #ef7a1a)",
              }}
            />
          </div>
          <span className="text-[0.6875rem] font-bold tabular-nums text-[color:var(--text-secondary)]">
            {progress.completedCount} / {progress.totalReady}
          </span>
        </div>
      </header>

      {suggestedHere ? (
        <p className="rounded-[12px] border border-[color:var(--color-brand-500)]/[0.3] bg-[color:var(--color-brand-500)]/[0.06] px-3.5 py-2.5 text-[0.75rem] leading-[1.45] text-[color:var(--text-secondary)]">
          Pelo seu momento financeiro, essa trilha faz sentido agora.{" "}
          <strong className="font-semibold text-[color:var(--color-brand-800)]">Sugestão, não obrigação.</strong>
        </p>
      ) : null}

      <NextModuleHero
        module={nextModule}
        trilhaSlug={trilha.slug}
        playable={progress.unlocked[nextModule.num] ?? false}
      />

      <section>
        <div className="mb-3 px-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
          Seu ritmo
        </div>
        <RhythmGrid modulesRead={progress.completedCount} />
      </section>

      {firstBook ? (
        <section>
          <div className="mb-3 px-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            Leitura recomendada
          </div>
          <BookCard book={firstBook} />
        </section>
      ) : null}

      <section>
        <div className="mb-3 px-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
          Plano da trilha
        </div>
        <div className="flex flex-col gap-2">
          {trilha.modules.map((m) => (
            <ModuleRow
              key={m.num}
              module={m}
              trilhaSlug={trilha.slug}
              isNext={m.num === progress.nextNum}
              unlocked={progress.unlocked[m.num] ?? false}
              completed={progress.completed[m.num] ?? false}
            />
          ))}
        </div>
      </section>

      <p className="px-2 text-center text-[0.6875rem] leading-[1.45] text-[color:var(--text-muted)]">
        A trilha cresce no seu ritmo.{" "}
        <strong className="font-bold text-[color:var(--text-secondary)]">
          A gente avisa quando o próximo módulo chegar.
        </strong>
      </p>
    </div>
  );
}

function renderTitleWithEmphasis(title: string, emphasis: string) {
  if (!emphasis || !title.includes(emphasis)) return title;
  const parts = title.split(emphasis);
  return (
    <>
      {parts[0]}
      <em className="italic text-[color:var(--color-brand-800)]">{emphasis}</em>
      {parts[1] ?? ""}
    </>
  );
}
