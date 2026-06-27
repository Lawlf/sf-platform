"use server";

import { z } from "zod";

import { moveTransactionsAccount } from "@/application/use-cases/transaction/move-transactions-account.use-case";
import { clock, repos } from "@/infrastructure/container";
import { withTransaction } from "@/infrastructure/persistence/drizzle/with-transaction";
import { action, unwrap } from "@/presentation/actions/action";

export const moveTransactionsAction = action({
  schema: z.object({
    transactionIds: z.array(z.string().uuid()).min(1),
    targetAccountId: z.string().uuid(),
  }),
  revalidates: ["report", "timeline", "home"],
  handler: async ({ transactionIds, targetAccountId }, { profileId }) => {
    return unwrap(
      await moveTransactionsAccount(
        {
          transactions: repos.transactions,
          assets: repos.assets,
          clock,
          transaction: withTransaction,
        },
        { profileId, transactionIds, targetAccountId },
      ),
    );
  },
  revalidatePaths: () => ["/app/lancamentos"],
});
