"use server";

import { z } from "zod";

import { deleteTransaction } from "@/application/use-cases/transaction/delete-transaction.use-case";
import { clock, repos } from "@/infrastructure/container";
import { withTransaction } from "@/infrastructure/persistence/drizzle/with-transaction";
import { action, unwrap } from "@/presentation/actions/action";

export const deleteTransactionAction = action({
  schema: z.object({ transactionId: z.string().uuid() }),
  revalidates: ["report", "timeline", "home"],
  handler: async ({ transactionId }, { profileId }) => {
    unwrap(
      await deleteTransaction(
        {
          transactions: repos.transactions,
          assets: repos.assets,
          clock,
          transaction: withTransaction,
        },
        { profileId, transactionId },
      ),
    );
    return { id: transactionId };
  },
  revalidatePaths: () => ["/app/lancamentos"],
});
