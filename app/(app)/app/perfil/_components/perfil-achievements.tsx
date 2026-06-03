import {
  Award,
  CalendarCheck,
  CalendarHeart,
  CircleCheckBig,
  HeartPulse,
  LineChart,
  type LucideIcon,
  Map as MapIcon,
  Medal,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";

import { ACHIEVEMENTS } from "@/domain/achievements/achievement.catalog";
import type { UserAchievementEntity } from "@/domain/entities/user-achievement.entity";

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Map: MapIcon,
  Wallet,
  Target,
  LineChart,
  CircleCheckBig,
  HeartPulse,
  TrendingUp,
  CalendarCheck,
  CalendarHeart,
  Award,
  Medal,
  Trophy,
};

function iconByName(name: string): LucideIcon {
  return ICONS[name] ?? Award;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

interface PerfilAchievementsProps {
  unlocked: UserAchievementEntity[];
}

export function PerfilAchievements({ unlocked }: PerfilAchievementsProps) {
  const unlockedMap = new Map(unlocked.map((u) => [u.slug, u.unlockedAt]));
  const ordered = [...ACHIEVEMENTS].sort((a, b) => {
    const ua = unlockedMap.has(a.slug) ? 0 : 1;
    const ub = unlockedMap.has(b.slug) ? 0 : 1;
    return ua - ub;
  });

  return (
    <section>
      <h2 className="mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        Conquistas
      </h2>
      <div className="grid gap-2 md:grid-cols-2">
        {ordered.map((a) => {
          const unlockedAt = unlockedMap.get(a.slug);
          const isUnlocked = Boolean(unlockedAt);
          const Icon = iconByName(a.iconName);
          return (
            <div
              key={a.slug}
              className={`flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl ${
                isUnlocked ? "" : "opacity-50"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isUnlocked
                    ? "bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]"
                    : "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]"
                }`}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.875rem] font-bold text-[color:var(--text-primary)]">
                  {a.title}
                </div>
                <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-secondary)]">
                  {a.description}
                </div>
              </div>
              <span className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                {isUnlocked && unlockedAt ? formatMonthYear(unlockedAt) : "Bloqueada"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
