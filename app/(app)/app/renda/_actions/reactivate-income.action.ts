"use server";

import { z } from "zod";

import { reactivateIncome } from "@/application/use-cases/income/reactivate-income.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const reactivateIncomeAction = action({
  schema: z.string(),
  revalidates: ["incomes", "home"],
  handler: async (incomeId, { userId, profileId }) => {
    unwrap(await reactivateIncome({ incomes: repos.incomes, clock }, { userId, profileId, incomeId }));
  },
});
