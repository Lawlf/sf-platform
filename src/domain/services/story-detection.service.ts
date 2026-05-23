import type { MonthlyDataPoint } from "./timeline.service";

export type StoryCardKind = "milestone" | "warning" | "achievement" | "insight";

export type StoryIconName = "Target" | "AlertTriangle" | "Flame" | "Star" | "TrendingUp" | "Award";

export interface StoryCard {
  kind: StoryCardKind;
  monthIso: string; // Story renderiza ANTES desse mês (chronologically before)
  eyebrow: string;
  line: string; // Pode conter "[[strong]]" markers que client substitui por <strong>strong</strong>
  iconName: StoryIconName;
}

const STREAK_MILESTONES = [3, 6, 12] as const;
const PATRIMONY_MULTIPLE = 10_000_00n; // 10k em cents

function brl(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  return `${negative ? "-" : ""}${reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}

function priorityOf(kind: StoryCardKind): number {
  switch (kind) {
    case "achievement":
      return 4;
    case "milestone":
      return 3;
    case "warning":
      return 2;
    case "insight":
      return 1;
  }
}

export class StoryDetectionService {
  static detect(points: MonthlyDataPoint[]): StoryCard[] {
    if (points.length === 0) return [];

    // Sort chronologically (oldest first)
    const sorted = [...points].sort((a, b) =>
      a.month.isBefore(b.month) ? -1 : a.month.isAfter(b.month) ? 1 : 0,
    );

    const candidates: StoryCard[] = [];

    // Track streak
    let streakCount = 0;
    const streaksEmitted = new Set<number>(); // which milestone (3/6/12) already emitted

    for (let i = 0; i < sorted.length; i++) {
      const point = sorted[i]!;
      const prev = i > 0 ? sorted[i - 1]! : null;

      // Streak tracking
      const isPositive = point.freeBalance.toCents() > 0n;
      if (isPositive) {
        streakCount += 1;
      } else {
        streakCount = 0;
        streaksEmitted.clear();
      }

      // Achievement: streak hits milestone
      for (const milestone of STREAK_MILESTONES) {
        if (streakCount === milestone && !streaksEmitted.has(milestone)) {
          candidates.push({
            kind: "achievement",
            monthIso: point.month.toIso(),
            eyebrow: "Conquista desbloqueada",
            line: `[[${milestone} meses consecutivos]] com saldo positivo.`,
            iconName: "Flame",
          });
          streaksEmitted.add(milestone);
        }
      }

      // Milestone: crossed multiple of 10k in netWorth
      if (prev) {
        const prevNw = prev.netWorth.toCents();
        const currNw = point.netWorth.toCents();
        if (currNw > prevNw) {
          // crossed any 10k multiple between prevNw and currNw
          const fromMultiple = prevNw / PATRIMONY_MULTIPLE;
          const toMultiple = currNw / PATRIMONY_MULTIPLE;
          if (toMultiple > fromMultiple && toMultiple > 0n) {
            const crossedValue = toMultiple * PATRIMONY_MULTIPLE;
            candidates.push({
              kind: "milestone",
              monthIso: point.month.toIso(),
              eyebrow: "Marco alcançado",
              line: `Você ultrapassou [[${brl(crossedValue)}]] de patrimônio líquido.`,
              iconName: "Target",
            });
          }
        }
      }

      // Warning: negative free balance
      if (point.freeBalance.toCents() < 0n) {
        candidates.push({
          kind: "warning",
          monthIso: point.month.toIso(),
          eyebrow: "Atenção",
          line: `Mês fechou com saldo negativo de [[${brl(point.freeBalance.toCents())}]].`,
          iconName: "AlertTriangle",
        });
      }
    }

    // Insight: best month (max freeBalance among all points)
    if (sorted.length >= 3) {
      let bestIdx = 0;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i]!.freeBalance.toCents() > sorted[bestIdx]!.freeBalance.toCents()) {
          bestIdx = i;
        }
      }
      const best = sorted[bestIdx]!;
      if (best.freeBalance.toCents() > 0n) {
        candidates.push({
          kind: "insight",
          monthIso: best.month.toIso(),
          eyebrow: "Seu melhor mês",
          line: `Saldo livre de [[${brl(best.freeBalance.toCents())}]]. Continue assim.`,
          iconName: "Star",
        });
      }
    }

    // Cap: max 1 story per 2 months (in terms of distinct months).
    // Sort by monthIso ascending, then by priority desc. Walk and keep first per 2-month bucket.
    candidates.sort((a, b) => {
      if (a.monthIso !== b.monthIso) return a.monthIso < b.monthIso ? -1 : 1;
      return priorityOf(b.kind) - priorityOf(a.kind);
    });

    const result: StoryCard[] = [];
    let lastEmittedMonthIso: string | null = null;
    for (const candidate of candidates) {
      if (!lastEmittedMonthIso) {
        result.push(candidate);
        lastEmittedMonthIso = candidate.monthIso;
        continue;
      }
      // Check if at least 2 months apart (compare ISO yyyy-mm)
      if (monthsBetween(lastEmittedMonthIso, candidate.monthIso) >= 2) {
        result.push(candidate);
        lastEmittedMonthIso = candidate.monthIso;
      } else if (candidate.monthIso === lastEmittedMonthIso) {
        // same month: skip (priority already enforced by sort order; first was higher priority)
      }
    }

    return result;
  }
}

function monthsBetween(aIso: string, bIso: string): number {
  const [ay, am] = aIso.split("-").map(Number) as [number, number];
  const [by, bm] = bIso.split("-").map(Number) as [number, number];
  return Math.abs((by - ay) * 12 + (bm - am));
}
