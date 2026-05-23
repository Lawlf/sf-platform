import type { TrilhaSpec } from "../_lib/trilhas";
import { BookCard } from "./book-card";
import { ModuleRow } from "./module-row";
import { NextModuleHero } from "./next-module-hero";
import { RhythmGrid } from "./rhythm-grid";

export interface TrilhaHomeProps {
  trilha: TrilhaSpec;
}

export function TrilhaHome({ trilha }: TrilhaHomeProps) {
  const nextModule = trilha.modules.find((m) => m.status !== "queued") ?? trilha.modules[0];
  if (!nextModule) {
    throw new Error(`Trilha ${trilha.slug} has no modules`);
  }
  const totalReady = trilha.modules.filter((m) => m.status === "ready").length;
  const firstBook = trilha.books[0];

  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="mb-2 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-800)]">
          <span
            className="block h-[1.5px] w-3.5 rounded-full"
            style={{ background: "linear-gradient(90deg, #f28e25, transparent)" }}
          />
          Sua trilha
        </div>
        <h1 className="font-serif text-[30px] font-bold leading-[1.05] tracking-[-0.025em] text-[color:var(--text-primary)] md:text-[42px]">
          {renderTitleWithEmphasis(trilha.title, trilha.emphasis)}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--border-soft)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(totalReady / trilha.modules.length) * 100}%`,
                background: "linear-gradient(90deg, #f28e25, #ef7a1a)",
              }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-[color:var(--text-secondary)]">
            {totalReady} / {trilha.modules.length}
          </span>
        </div>
      </header>

      <NextModuleHero module={nextModule} />

      <section>
        <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
          Seu ritmo
        </div>
        <RhythmGrid modulesRead={0} />
      </section>

      {firstBook ? (
        <section>
          <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
            Leitura recomendada
          </div>
          <BookCard book={firstBook} />
        </section>
      ) : null}

      <section>
        <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-secondary)]">
          Plano da trilha
        </div>
        <div className="flex flex-col gap-2">
          {trilha.modules.map((m) => (
            <ModuleRow key={m.num} module={m} isNext={m.num === nextModule.num} />
          ))}
        </div>
      </section>

      <p className="px-2 text-center text-[11px] leading-[1.45] text-[color:var(--text-muted)]">
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
