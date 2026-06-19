"use server";

import { z } from "zod";

import { archiveDebt } from "@/application/use-cases/debt/archive-debt.use-case";
import { UpstashDistributedLock } from "@/infrastructure/cache/upstash-distributed-lock";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

import { detectNotificationsForUser } from "../../../_actions/_notifications";

export const archiveDebtAction = action({
  schema: z.object({
    debtId: z.string(),
    reason: z.enum(["paid_off", "written_off"]),
    note: z.string().optional(),
  }),
  revalidates: ["debts", "timeline", "notifications", "home"],
  handler: async ({ debtId, reason, note }, { userId, profileId }) => {
    unwrap(
      await archiveDebt(
        {
          debts: repos.debts,
          payments: repos.debtPayments,
          clock,
          lock: new UpstashDistributedLock(),
        },
        { userId, profileId, debtId, reason, ...(note !== undefined ? { note } : {}) },
      ),
    );
    await detectNotificationsForUser(userId);
  },
  revalidatePaths: (_data, { debtId }) => [`/app/dividas/${debtId}`],
});
