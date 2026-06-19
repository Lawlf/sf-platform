"use server";

import { z } from "zod";

import { reactivateDebt } from "@/application/use-cases/debt/reactivate-debt.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

import { detectNotificationsForUser } from "../../../_actions/_notifications";

export const reactivateDebtAction = action({
  schema: z.string(),
  revalidates: ["debts", "timeline", "notifications", "home"],
  handler: async (debtId, { userId, profileId }) => {
    unwrap(
      await reactivateDebt(
        {
          debts: repos.debts,
          payments: repos.debtPayments,
          clock,
        },
        { userId, profileId, debtId },
      ),
    );
    await detectNotificationsForUser(userId);
  },
  revalidatePaths: (_data, debtId) => [`/app/dividas/${debtId}`],
});
