import type { Clock } from "@/domain/ports/clock.port";
import type { MonthClosingRepositoryPort } from "@/domain/ports/repositories/month-closing.repository";
import { MonthYear } from "@/domain/value-objects/month-year.vo";

export interface GetOpenMonthDeps {
  closings: MonthClosingRepositoryPort;
  clock: Clock;
}

export async function getOpenMonth(
  deps: GetOpenMonthDeps,
  input: { userId: string },
): Promise<{ openMonthIso: string } | null> {
  const lastEnded = MonthYear.fromDate(deps.clock.now()).previous();
  const latest = await deps.closings.latest(input.userId);
  const candidate = latest ? MonthYear.fromDate(latest.month).next() : lastEnded;
  if (candidate.isAfter(lastEnded)) return null;
  return { openMonthIso: candidate.toIso() };
}
