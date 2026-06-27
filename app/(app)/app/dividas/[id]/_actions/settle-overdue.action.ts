"use server";

import { z } from "zod";

import { settleOverdueDebt } from "@/application/use-cases/debt/settle-overdue-debt.use-case";
import { UpstashDistributedLock } from "@/infrastructure/cache/upstash-distributed-lock";
import { clock, repos } from "@/infrastructure/container";
import { withTransaction } from "@/infrastructure/persistence/drizzle/with-transaction";
import { action, unwrap } from "@/presentation/actions/action";

import { awardEventAchievement } from "../../../_actions/_achievements";
import { detectNotificationsForUser } from "../../../_actions/_notifications";

export const settleOverdueAction = action({
  schema: z.object({
    debtId: z.string().uuid(),
    cycleIso: z.string().regex(/^\d{4}-\d{2}$/),
  }),
  revalidates: ["debts", "timeline", "notifications", "home"],
  handler: async ({ debtId, cycleIso }, { userId, profileId }) => {
    const result = unwrap(
      await settleOverdueDebt(
        {
          debts: repos.debts,
          payments: repos.debtPayments,
          acknowledgements: repos.debtDueAcknowledgements,
          clock,
          lock: new UpstashDistributedLock(),
          transaction: withTransaction,
        },
        { userId, profileId, debtId, cycleIso },
      ),
    );
    await detectNotificationsForUser(userId);
    if (result.paidOff) {
      const settled = await repos.debts.findById(debtId);
      if (settled) await awardEventAchievement(userId, "quitacao", { debtLabel: settled.label });
    }
    return {
      outcome: result.outcome,
      paidOff: result.paidOff,
      remainingFormatted:
        result.remaining && result.remaining.isPositive() ? result.remaining.format() : null,
    };
  },
  revalidatePaths: (_data, { debtId }) => [`/app/dividas/${debtId}`],
});
