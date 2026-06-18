"use server";

import { captureInvestmentSnapshot } from "@/application/use-cases/investments/capture-investment-snapshot.use-case";
import { getInvestmentEvolution } from "@/application/use-cases/investments/get-investment-evolution.use-case";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

export interface SerializedEvolutionMonth {
  month: string;
  byType: Record<string, string>;
}

export interface SerializedInvestmentEvolution {
  types: string[];
  months: SerializedEvolutionMonth[];
}

export async function fetchInvestmentEvolution(): Promise<SerializedInvestmentEvolution | null> {
  const user = await requireUser();
  if (!user.isPro) return null;

  const profileId = await getActiveProfileId();
  const assets = await repos.assets.findActiveByProfileAndCategory(profileId, "investment");
  await captureInvestmentSnapshot(
    { snapshots: repos.investmentSnapshots, clock },
    { userId: user.id, profileId, assets },
  );

  const evo = await getInvestmentEvolution(
    { snapshots: repos.investmentSnapshots },
    { profileId },
  );
  if (evo.types.length === 0) return null;

  return {
    types: evo.types,
    months: evo.months.map((m) => ({
      month: m.month,
      byType: Object.fromEntries(
        Object.entries(m.byType).map(([t, cents]) => [t, cents.toString()]),
      ),
    })),
  };
}
