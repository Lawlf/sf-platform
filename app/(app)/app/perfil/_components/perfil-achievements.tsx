import { Award, Sparkles, Target, Trophy } from "lucide-react";
import type { ReactNode } from "react";

interface Achievement {
  icon: ReactNode;
  title: string;
  description: string;
  locked: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    icon: <Sparkles size={18} strokeWidth={1.75} aria-hidden />,
    title: "Primeiro passo",
    description: "Cadastrou sua primeira dívida.",
    locked: false,
  },
  {
    icon: <Target size={18} strokeWidth={1.75} aria-hidden />,
    title: "Mapa do tesouro",
    description: "Cadastrou seu primeiro ativo.",
    locked: false,
  },
  {
    icon: <Award size={18} strokeWidth={1.75} aria-hidden />,
    title: "Saúde verde",
    description: "Mantenha renda comprometida abaixo de 30%.",
    locked: true,
  },
  {
    icon: <Trophy size={18} strokeWidth={1.75} aria-hidden />,
    title: "Veterano",
    description: "Use a plataforma por 30 dias seguidos.",
    locked: true,
  },
];

export function PerfilAchievements() {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        Conquistas
      </h2>
      <div className="grid gap-2 md:grid-cols-2">
        {ACHIEVEMENTS.map((a) => (
          <div
            key={a.title}
            className={`flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl ${
              a.locked ? "opacity-50" : ""
            }`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                a.locked
                  ? "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]"
                  : "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
              }`}
            >
              {a.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold text-[color:var(--text-primary)]">
                {a.title}
              </div>
              <div className="mt-0.5 text-[11px] text-[color:var(--text-secondary)]">
                {a.description}
              </div>
            </div>
            {a.locked ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                Em breve
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-3 px-1 text-[11px] text-[color:var(--text-muted)]">
        Conquistas dinâmicas chegam no Plan 8 (gamificação). Por enquanto, vitrine estática.
      </p>
    </section>
  );
}
