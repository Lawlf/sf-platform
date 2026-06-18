"use server";

import { z } from "zod";

import { deleteIncome } from "@/application/use-cases/income/delete-income.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

import { detectNotificationsForUser } from "../../_actions/_notifications";
import { purgeEntityBestEffort } from "../../_actions/_purge-entity";

export const deleteIncomeAction = action({
  schema: z.string(),
  revalidates: ["incomes", "timeline", "notifications", "home"],
  handler: async (incomeId, { userId, profileId }) => {
    unwrap(await deleteIncome({ incomes: repos.incomes, clock }, { userId, profileId, incomeId }));

    await purgeEntityBestEffort(userId, "income", incomeId);
    await detectNotificationsForUser(userId);
  },
  revalidatePaths: (_data, incomeId) => [`/app/renda/${incomeId}`],
});
