import { CompoundGrowthService } from "./compound-growth.service";

export function projectFixedIncomeOneYear(
  currentCents: bigint,
  annualRatePct: number,
): bigint | null {
  if (currentCents <= 0n) return null;
  if (!Number.isFinite(annualRatePct) || annualRatePct <= 0) return null;
  const { finalCents } = CompoundGrowthService.simulate({
    initialCents: currentCents,
    monthlyContributionCents: 0n,
    annualRatePct,
    years: 1,
  });
  return finalCents;
}
