"use server";

import { z } from "zod";

import { archiveIncome } from "@/application/use-cases/income/archive-income.use-case";
import { repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const archiveIncomeAction = action({
  schema: z.string(),
  revalidates: ["incomes"],
  handler: async (incomeId, { userId }) => {
    unwrap(await archiveIncome({ incomes: repos.incomes }, { userId, incomeId }));
  },
});
