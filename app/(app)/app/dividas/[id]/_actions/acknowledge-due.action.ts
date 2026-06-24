"use server";

import { z } from "zod";

import { acknowledgeDebtDue } from "@/application/use-cases/debt/acknowledge-debt-due.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const acknowledgeDueAction = action({
  schema: z.object({
    debtId: z.string(),
    cycleIso: z.string().regex(/^\d{4}-\d{2}$/),
    response: z.enum(["paid", "deferred"]),
  }),
  revalidates: ["debts", "timeline", "notifications", "home"],
  handler: async ({ debtId, cycleIso, response }, { userId, profileId }) => {
    unwrap(
      await acknowledgeDebtDue(
        { debts: repos.debts, acknowledgements: repos.debtDueAcknowledgements, clock },
        { userId, profileId, debtId, cycleIso, response },
      ),
    );
  },
  revalidatePaths: (_data, { debtId }) => [`/app/dividas/${debtId}`],
});
