import type { Clock } from "@/domain/ports/clock.port";
import type { AchievementProgressRepositoryPort } from "@/domain/ports/repositories/achievement-progress.repository";

import { longestConsecutiveMonths, totalDistinctMonths } from "./streak-math";

export interface SustainedEvaluation {
  saudeVerde: boolean;
  patrimonioPositivo: boolean;
  monthActive: boolean;
}

export interface RecomputeDerivedDeps {
  progress: AchievementProgressRepositoryPort;
  clock: Clock;
  award: (userId: string, slug: string) => Promise<void>;
  activeMonths: string[];
  evaluate: (userId: string) => Promise<SustainedEvaluation>;
}

const SUSTAINED_TARGET_MONTHS = 3;

const SUSTAINED: { slug: string; pick: (e: SustainedEvaluation) => boolean }[] = [
  { slug: "saude-verde-3m", pick: (e) => e.saudeVerde },
  { slug: "patrimonio-positivo-3m", pick: (e) => e.patrimonioPositivo },
];

function currentMonthIso(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function recomputeDerivedAchievementsForUser(
  deps: RecomputeDerivedDeps,
  userId: string,
): Promise<void> {
  const consecutive = longestConsecutiveMonths(deps.activeMonths);
  const distinct = totalDistinctMonths(deps.activeMonths);

  if (consecutive >= 3) await deps.award(userId, "check-in-3m");
  if (consecutive >= 6) await deps.award(userId, "check-in-6m");
  if (distinct >= 12) await deps.award(userId, "jornada-12m");
  if (distinct >= 24) await deps.award(userId, "jornada-24m");
  if (distinct >= 60) await deps.award(userId, "jornada-60m");

  const evaluation = await deps.evaluate(userId);
  const monthIso = currentMonthIso(deps.clock.now());

  for (const { slug, pick } of SUSTAINED) {
    const qualifies = evaluation.monthActive && pick(evaluation);
    const state = (await deps.progress.get(userId, slug)) ?? {
      qualifiedMonths: 0,
      lastQualifiedMonth: null,
    };

    if (!qualifies) {
      if (state.qualifiedMonths !== 0) {
        await deps.progress.set(
          userId,
          slug,
          { qualifiedMonths: 0, lastQualifiedMonth: null },
          deps.clock.now(),
        );
      }
      continue;
    }

    if (state.lastQualifiedMonth === monthIso) continue;

    const next = {
      qualifiedMonths: state.qualifiedMonths + 1,
      lastQualifiedMonth: monthIso,
    };
    await deps.progress.set(userId, slug, next, deps.clock.now());
    if (next.qualifiedMonths >= SUSTAINED_TARGET_MONTHS) {
      await deps.award(userId, slug);
    }
  }
}
