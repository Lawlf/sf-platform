"use server";

import { getTimelineForUser } from "@/application/use-cases/timeline/get-timeline-for-user.use-case";
import type {
  TimelineRange,
  TimelineShow,
} from "@/application/use-cases/timeline/get-timeline-for-user.use-case";
import type { StoryIconName, StoryCardKind } from "@/domain/services/story-detection.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { clock, repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { serializeMoney, type SerializedMoney } from "./_serialize";

export interface SerializedMonthlyDataPoint {
  monthIso: string;
  monthLabel: string;
  totalIncome: SerializedMoney;
  totalDebtPayments: SerializedMoney;
  freeBalance: SerializedMoney;
  netWorth: SerializedMoney;
  assetsTotal: SerializedMoney;
  debtsBalance: SerializedMoney;
}

export interface SerializedStoryCard {
  kind: StoryCardKind;
  monthIso: string;
  eyebrow: string;
  line: string;
  iconName: StoryIconName;
}

export interface SerializedTimelinePage {
  points: SerializedMonthlyDataPoint[];
  stories: SerializedStoryCard[];
  olderMonthIso: string | null;
  oldestUserDataIso: string | null;
}

export interface FetchTimelinePageInput {
  beforeIso: string;
  limit?: number;
  range?: TimelineRange;
  show?: TimelineShow;
}

const DEFAULT_LIMIT = 6;

export async function fetchTimelinePage(
  input: FetchTimelinePageInput,
): Promise<SerializedTimelinePage | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  let before: MonthYear;
  try {
    before = MonthYear.fromIso(input.beforeIso);
  } catch {
    return null;
  }

  const limit = Math.max(1, Math.min(24, input.limit ?? DEFAULT_LIMIT));

  const result = await getTimelineForUser(
    {
      incomes: repos.incomes,
      debts: repos.debts,
      debtPayments: repos.debtPayments,
      assets: repos.assets,
      debtAmountAdjustments: repos.debtAmountAdjustments,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
      clock,
    },
    {
      userId: user.id,
      before,
      limit,
      ...(input.range !== undefined ? { range: input.range } : {}),
      ...(input.show !== undefined ? { show: input.show } : {}),
    },
  );
  if (!isOk(result)) return null;
  const r = result.value;

  return {
    points: r.points.map((p) => ({
      monthIso: p.month.toIso(),
      monthLabel: p.month.format(),
      totalIncome: serializeMoney(p.totalIncome),
      totalDebtPayments: serializeMoney(p.totalDebtPayments),
      freeBalance: serializeMoney(p.freeBalance),
      netWorth: serializeMoney(p.netWorth),
      assetsTotal: serializeMoney(p.assetsTotal),
      debtsBalance: serializeMoney(p.debtsBalance),
    })),
    stories: r.stories.map((s) => ({
      kind: s.kind,
      monthIso: s.monthIso,
      eyebrow: s.eyebrow,
      line: s.line,
      iconName: s.iconName,
    })),
    olderMonthIso: r.olderMonthIso,
    oldestUserDataIso: r.oldestUserDataIso,
  };
}
