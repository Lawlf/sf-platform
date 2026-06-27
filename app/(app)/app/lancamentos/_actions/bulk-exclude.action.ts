"use server";

import { z } from "zod";

import { setTransactionsExcluded } from "@/application/use-cases/transaction/set-transactions-excluded.use-case";
import { repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const bulkExcludeAction = action({
  schema: z.object({
    transactionIds: z.array(z.string().uuid()).min(1),
    excluded: z.boolean(),
  }),
  revalidates: ["report", "timeline", "home"],
  handler: async ({ transactionIds, excluded }, { profileId }) => {
    return unwrap(
      await setTransactionsExcluded(
        { transactions: repos.transactions },
        { profileId, transactionIds, excluded },
      ),
    );
  },
  revalidatePaths: () => ["/app/lancamentos"],
});
