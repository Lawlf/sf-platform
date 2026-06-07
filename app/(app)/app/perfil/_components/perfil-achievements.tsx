import type { Route } from "next";
import Link from "next/link";

import { ACHIEVEMENTS, getAchievement } from "@/domain/achievements/achievement.catalog";
import type { UserAchievementEntity } from "@/domain/entities/user-achievement.entity";

import { getAchievementIcon } from "../../_components/achievement-icons";

interface PerfilAchievementsProps {
  unlocked: UserAchievementEntity[];
}

export function PerfilAchievements({ unlocked }: PerfilAchievementsProps) {
  const total = ACHIEVEMENTS.length;
  const count = unlocked.length;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const recent = [...unlocked]
    .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
    .slice(0, 3)
    .map((u) => ({ unlockedAt: u.unlockedAt, def: getAchievement(u.slug) }))
    .filter((r): r is { unlockedAt: Date; def: NonNullable<typeof r.def> } => r.def != null);

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          Conquistas
        </h2>
        <Link
          href={"/app/conquistas" as Route}
          className="flex items-center gap-2 text-[0.6875rem] font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
        >
          {count > 0 ? `${count} ${count === 1 ? "conquista" : "conquistas"}` : null}
          <span className="text-[color:var(--color-brand-800)]">Ver todas</span>
        </Link>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--border-strong)]">
        <div
          className="h-full rounded-full bg-[color:var(--color-brand-500)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      {recent.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {recent.map(({ def }) => {
            const Icon = getAchievementIcon(def.iconName);
            return (
              <div
                key={def.slug}
                className="flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] py-1.5 pl-1.5 pr-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
                  <Icon size={15} strokeWidth={1.75} aria-hidden />
                </span>
                <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                  {def.title}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-[0.6875rem] text-[color:var(--text-muted)]">
          Sua primeira conquista aparece aqui.
        </p>
      )}
    </section>
  );
}
