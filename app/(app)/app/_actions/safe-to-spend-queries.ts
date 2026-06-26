"use server";

import { getSafeToSpend } from "@/application/use-cases/dashboard/get-safe-to-spend.use-case";
import { DEFAULT_CONSERVATIVE_LEVEL } from "@/domain/services/safe-to-spend.service";
import { clock, repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

export interface SerializedSafeToSpend {
  state: "ok" | "tight-by-goal" | "underwater";
  poolCents: string;
  perWeekCents: string;
  perWeekWithoutGoalCents: string;
  shortfallCents: string;
}

export async function fetchSafeToSpend(): Promise<SerializedSafeToSpend | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const profileId = await getActiveProfileId();
  if (!profileId) return null;

  const profile = await repos.profiles.findById(profileId);
  const level = profile?.conservativeLevel ?? DEFAULT_CONSERVATIVE_LEVEL;

  const result = await getSafeToSpend(
    {
      debts: repos.debts,
      incomes: repos.incomes,
      clock,
      rates: repos.exchangeRates,
      overrides: repos.userFxOverrides,
      incomeSettlements: repos.incomeSettlements,
      debtPayments: repos.debtPayments,
      debtAmountAdjustments: repos.debtAmountAdjustments,
      recurringSettlements: repos.recurringSettlements,
      goals: repos.goals,
    },
    { userId: user.id, profileId, level },
  );
  if (isErr(result)) return null;

  const s = result.value;
  return {
    state: s.state,
    poolCents: s.poolCents.toString(),
    perWeekCents: s.perWeekCents.toString(),
    perWeekWithoutGoalCents: s.perWeekWithoutGoalCents.toString(),
    shortfallCents: s.shortfallCents.toString(),
  };
}
