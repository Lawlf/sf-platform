"use server";

import { z } from "zod";

import { deleteDebt } from "@/application/use-cases/debt/delete-debt.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

import { detectNotificationsForUser } from "../../../_actions/_notifications";
import { purgeEntityBestEffort } from "../../../_actions/_purge-entity";

export const deleteDebtAction = action({
  schema: z.string(),
  revalidates: ["debts", "timeline", "notifications", "home", "assets"],
  handler: async (debtId, { userId, profileId }) => {
    unwrap(
      await deleteDebt(
        {
          debts: repos.debts,
          payments: repos.debtPayments,
          allocations: repos.assetDebtAllocations,
          clock,
        },
        { userId, profileId, debtId },
      ),
    );
    await purgeEntityBestEffort(userId, "debt", debtId);
    await detectNotificationsForUser(userId);
  },
  revalidatePaths: (_data, debtId) => [`/app/dividas/${debtId}`],
});
