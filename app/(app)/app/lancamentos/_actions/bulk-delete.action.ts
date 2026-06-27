"use server";

import { z } from "zod";

import { deleteTransaction } from "@/application/use-cases/transaction/delete-transaction.use-case";
import { clock, repos } from "@/infrastructure/container";
import { withTransaction } from "@/infrastructure/persistence/drizzle/with-transaction";
import { action, unwrap } from "@/presentation/actions/action";

export const bulkDeleteAction = action({
  schema: z.object({ transactionIds: z.array(z.string().uuid()).min(1) }),
  revalidates: ["report", "timeline", "home"],
  handler: async ({ transactionIds }, { profileId }) => {
    const ids = [...new Set(transactionIds)];
    for (const transactionId of ids) {
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
    }
    return { count: ids.length };
  },
  revalidatePaths: () => ["/app/lancamentos"],
});
