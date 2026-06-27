"use server";

import { z } from "zod";

import { setTransactionsCategory } from "@/application/use-cases/transaction/set-transactions-category.use-case";
import { repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const bulkCategorizeAction = action({
  schema: z.object({
    transactionIds: z.array(z.string().uuid()).min(1),
    category: z.string().nullable(),
  }),
  revalidates: ["report", "timeline", "home"],
  handler: async ({ transactionIds, category }, { profileId }) => {
    const r = unwrap(
      await setTransactionsCategory(
        { transactions: repos.transactions },
        { profileId, transactionIds, category: category && category.length > 0 ? category : null },
      ),
    );
    return r;
  },
  revalidatePaths: () => ["/app/lancamentos"],
});
