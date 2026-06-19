import type { MonthClosingEntity } from "@/domain/entities/month-closing.entity";
import {
  buildTrail,
  computeDelta,
  nextMilestoneFor,
  tierFor,
  type ClosingWithMetrics,
  type ConsistencyDelta,
} from "@/domain/services/consistency.service";
import type { PrescriptionState } from "@/domain/services/prescription/prescription.types";

import { totalDistinctMonths } from "./streak-math";

export interface GetConsistencyCardDeps {
  usage: { listActiveMonthIsos: (userId: string) => Promise<string[]> };
  closings: { listForProfile: (profileId: string) => Promise<MonthClosingEntity[]> };
  now: () => Date;
}

export interface GetConsistencyCardInput {
  userId: string;
  profileId: string;
  state: PrescriptionState;
}

export interface ConsistencyCardView {
  tier: string;
  monthsActive: number;
  trail: boolean[];
  milestone: number | null;
  monthsToNext: number | null;
  delta: ConsistencyDelta | null;
}

function hasMetrics(
  c: MonthClosingEntity,
): c is MonthClosingEntity & {
  endDebtBalanceCents: bigint;
  endReserveCents: bigint;
  committedPctBps: number;
} {
  return (
    c.endDebtBalanceCents != null &&
    c.endReserveCents != null &&
    c.committedPctBps != null
  );
}

export async function getConsistencyCard(
  deps: GetConsistencyCardDeps,
  input: GetConsistencyCardInput,
): Promise<ConsistencyCardView> {
  const [activeMonths, closings] = await Promise.all([
    deps.usage.listActiveMonthIsos(input.userId),
    deps.closings.listForProfile(input.profileId),
  ]);

  const monthsActive = totalDistinctMonths(activeMonths);
  const { milestone, monthsToNext } = nextMilestoneFor(monthsActive);
  const trail = buildTrail(activeMonths, deps.now());

  const withMetrics: ClosingWithMetrics[] = closings.filter(hasMetrics).map((c) => ({
    month: c.month,
    endNetWorthCents: c.endNetWorthCents,
    endDebtBalanceCents: c.endDebtBalanceCents,
    endReserveCents: c.endReserveCents,
    committedPctBps: c.committedPctBps,
  }));

  const delta = computeDelta(input.state, withMetrics);

  return { tier: tierFor(monthsActive), monthsActive, trail, milestone, monthsToNext, delta };
}
