import type { Metadata, Route } from "next";

import {
  ACHIEVEMENTS,
  achievementsByDetection,
  type AchievementDetection,
} from "@/domain/achievements/achievement.catalog";
import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { getAchievementIcon } from "../_components/achievement-icons";
import { PageShell } from "../_components/page-shell";

export const metadata: Metadata = { title: "Conquistas" };

const SECTIONS: { detection: AchievementDetection; title: string; subtitle: string }[] = [
  {
    detection: "event",
    title: "Primeiros passos",
    subtitle: "Marcos de quando você começa a usar cada parte do app.",
  },
  {
    detection: "sustained",
    title: "Saúde financeira",
    subtitle: "Recompensas por manter bons hábitos ao longo dos meses.",
  },
  {
    detection: "tenure",
    title: "Tempo de uso",
    subtitle: "Sua constância acompanhando as finanças por aqui.",
  },
];

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

// Conquistas de hábito/tempo embutem o alvo no slug (saude-verde-3m, jornada-12m).
function targetMonths(slug: string): number | null {
  const m = /-(\d+)m$/.exec(slug);
  return m ? Number(m[1]) : null;
}

export default async function ConquistasPage() {
  const user = await requireUser();
  const unlocked = await repos.userAchievements.listForUser(user.id);
  const unlockedMap = new Map(unlocked.map((u) => [u.slug, u.unlockedAt]));
  const total = ACHIEVEMENTS.length;
  const done = unlocked.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const slugsWithProgress = ACHIEVEMENTS.filter(
    (a) =>
      (a.detection === "sustained" || a.detection === "tenure") && !unlockedMap.has(a.slug),
  ).map((a) => a.slug);
  const progressEntries = await Promise.all(
    slugsWithProgress.map(
      async (slug) => [slug, await repos.achievementProgress.get(user.id, slug)] as const,
    ),
  );
  const progressMap = new Map(progressEntries);

  return (
    <PageShell
      title="Conquistas"
      description="O que você já desbloqueou e o que falta."
      backHref={"/app/perfil" as Route}
    >
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
            {done} de {total} desbloqueadas
          </span>
          <span className="text-[0.75rem] font-semibold text-[color:var(--text-muted)]">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
          <div
            className="h-full rounded-full bg-[color:var(--color-brand-500)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {SECTIONS.map((section) => {
        const items = achievementsByDetection(section.detection);
        return (
          <section key={section.detection} className="flex flex-col gap-2">
            <div className="px-1">
              <h2 className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                {section.title}
              </h2>
              <p className="mt-0.5 text-[0.6875rem] text-[color:var(--text-secondary)]">
                {section.subtitle}
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {items.map((a) => {
                const unlockedAt = unlockedMap.get(a.slug);
                const isUnlocked = Boolean(unlockedAt);
                const Icon = getAchievementIcon(a.iconName);
                const target = isUnlocked ? null : targetMonths(a.slug);
                const qualified = progressMap.get(a.slug)?.qualifiedMonths ?? 0;
                const showProgress = target != null && target > 0;
                const progressPct = showProgress
                  ? Math.min(100, Math.round((qualified / target) * 100))
                  : 0;
                return (
                  <div
                    key={a.slug}
                    className={`flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl ${
                      isUnlocked ? "" : "opacity-50"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${
                        isUnlocked
                          ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
                          : "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]"
                      }`}
                    >
                      <Icon size={20} strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                        {a.title}
                      </div>
                      <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-secondary)]">
                        {a.description}
                      </div>
                      {showProgress ? (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
                          <div
                            className="h-full rounded-full bg-[color:var(--color-brand-500)]"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <span className="flex-none text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                      {isUnlocked && unlockedAt
                        ? formatMonthYear(unlockedAt)
                        : showProgress
                          ? `${qualified} de ${target} meses`
                          : "Bloqueada"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </PageShell>
  );
}
