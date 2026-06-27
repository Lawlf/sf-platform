"use server";

import { z } from "zod";

import { updateTransaction } from "@/application/use-cases/transaction/update-transaction.use-case";
import { clock, repos } from "@/infrastructure/container";
import { withTransaction } from "@/infrastructure/persistence/drizzle/with-transaction";
import { action, unwrap } from "@/presentation/actions/action";

export const updateTransactionAction = action({
  schema: z.object({
    transactionId: z.string().uuid(),
    category: z.string().nullable(),
    description: z.string().optional(),
    amountCents: z.coerce.bigint().positive().optional(),
    occurredAtIso: z.string().optional(),
  }),
  revalidates: ["report", "timeline", "home"],
  handler: async (
    { transactionId, category, description, amountCents, occurredAtIso },
    { profileId },
  ) => {
    const occurredAt = occurredAtIso ? new Date(occurredAtIso) : undefined;
    const updated = unwrap(
      await updateTransaction(
        {
          transactions: repos.transactions,
          assets: repos.assets,
          clock,
          transaction: withTransaction,
        },
        {
          profileId,
          transactionId,
          category: category && category.length > 0 ? category : null,
          ...(description !== undefined ? { description } : {}),
          ...(amountCents !== undefined ? { amountCents } : {}),
          ...(occurredAt && !Number.isNaN(occurredAt.getTime()) ? { occurredAt } : {}),
        },
      ),
    );
    return { id: updated.id, category: updated.category };
  },
  revalidatePaths: () => ["/app/lancamentos"],
});
